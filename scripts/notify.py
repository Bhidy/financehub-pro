#!/usr/bin/env python3
"""
notify.py — verified, multi-channel alert delivery (Discord → email fallback).
==============================================================================
Closes the "Discord is the ONLY alert channel, with no delivery check" gap
(audit H3): a dead, rotated, rate-limited, or 403'd Discord webhook used to mean
a totally SILENT failure — the alert was "sent" and lost. This module makes that
impossible: it POSTs to Discord *and verifies the HTTP status*, and if Discord is
missing / non-2xx / raises, it falls back to EMAIL over SMTP. It NEVER raises
(best-effort by contract) and returns a small status dict so callers can see
exactly which channel(s) delivered.

Dependency-light ON PURPOSE: standard library only (urllib + smtplib + email).
No httpx/requests, so it runs anywhere the watchdog runs (the self-hosted Hetzner
runner, Supabase-cron containers, a bare `python` shell) with nothing to install.

Channels & env (reuses the EXISTING repo contract — see below, nothing invented):
  Discord:  DISCORD_WEBHOOK_URL                      (already used everywhere)
  Email:    NOTIFICATION_EMAIL  — Gmail address; used as SMTP login, From AND To.
            SMTP_PASSWORD       — Gmail App Password (myaccount.google.com/apppasswords).
            Optional overrides (same names backend-core's notification_service.py
            already honors): SMTP_HOST (default smtp.gmail.com), SMTP_PORT (587),
            ALERT_EMAIL (recipient, if it must differ from NOTIFICATION_EMAIL).

Provenance of the SMTP convention (so the fallback matches what the owner set up):
  - activate_data_updates.sh documents the two GitHub secrets verbatim:
      NOTIFICATION_EMAIL = "Your Gmail address"
      SMTP_PASSWORD      = "Your Gmail App Password"
  - backend-core/app/services/notification_service.py is the repo's one SMTP
    implementation: smtp.gmail.com:587 + starttls() + login() + send_message().
  This module deliberately mirrors that host/port/transport so a human only has to
  confirm the two secrets already exist — no new infra.

Usage (library — the primary entry point):
    from notify import send_alert
    status = send_alert("WATCHDOG IS DOWN", "no heartbeat for 95m")
    # status -> {"discord": "ok"|"skip(no url)"|"http 403"|"error: ...",
    #            "email":   "ok"|"skip(...)"|"error: ..."|"not_attempted",
    #            "delivered": True/False}

Usage (CLI — handy for a one-off test of BOTH channels from the runner):
    DISCORD_WEBHOOK_URL=... NOTIFICATION_EMAIL=... SMTP_PASSWORD=... \
        python scripts/notify.py "test title" "test body"
"""
import json
import os
import smtplib
import sys
import urllib.request
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText


def _log(msg: str) -> None:
    """All diagnostics go to stderr so they never pollute machine-readable stdout."""
    print(f"[notify] {msg}", file=sys.stderr)


def _send_discord(title: str, message: str, timeout: int = 15) -> str:
    """POST to the Discord webhook and VERIFY the response.

    Returns "ok" only on a 2xx/204 status. Any other outcome (missing URL,
    non-2xx, network error) returns a short diagnostic string and is treated by
    the caller as a delivery FAILURE that must trigger the email fallback.
    Never raises.
    """
    url = os.environ.get("DISCORD_WEBHOOK_URL")
    if not url:
        return "skip(no url)"
    try:
        # Discord embed: keep within the 4096-char description limit, with headroom.
        body = json.dumps({
            "embeds": [{
                "title": str(title)[:256],
                "description": str(message)[:3900],
                "color": 0xE74C3C,
            }]
        }).encode()
        req = urllib.request.Request(
            url, data=body, headers={"Content-Type": "application/json"}
        )
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            code = resp.getcode()
        # Discord returns 204 No Content on success; accept the whole 2xx range.
        if code is not None and 200 <= code < 300:
            return "ok"
        return f"http {code}"
    except urllib.error.HTTPError as e:
        # 4xx/5xx (e.g. 403 disabled webhook, 404 deleted, 429 rate-limited) — the
        # exact silent-death class this module exists to surface.
        return f"http {e.code}"
    except Exception as e:  # noqa: BLE001 — best-effort by contract
        return f"error: {type(e).__name__}: {e}"


def _send_email(title: str, message: str, timeout: int = 20) -> str:
    """Send the alert as a plaintext email over SMTP (Gmail/STARTTLS by default).

    Reuses the env contract documented in activate_data_updates.sh and the SMTP
    transport from backend-core's notification_service.py. NEVER raises.

    ENV-CONTRACT WARNING (deploy foot-gun — read before setting secrets):
      This module logs in with NOTIFICATION_EMAIL + SMTP_PASSWORD (recipient
      defaults to that login; ALERT_EMAIL only overrides the To). That is the
      CORRECT choice here — it matches the GitHub Actions secrets documented in
      activate_data_updates.sh, which is what the pipeline-watchdog workflow
      injects. It is INTENTIONALLY DIFFERENT from backend-core/app/services/
      notification_service.py, which uses SMTP_USER / SMTP_PASS / ALERT_EMAIL.
      The GitHub Actions secrets to set for THIS fallback are:
          NOTIFICATION_EMAIL   (Gmail address — login, From, default To)
          SMTP_PASSWORD        (Gmail App Password)
      Do NOT set SMTP_USER / SMTP_PASS expecting this module to read them — it
      does not, and the fallback would be silently dead (the H3 failure).
    """
    user = os.environ.get("NOTIFICATION_EMAIL")
    password = os.environ.get("SMTP_PASSWORD")
    if not user or not password:
        return "skip(no NOTIFICATION_EMAIL/SMTP_PASSWORD)"
    host = os.environ.get("SMTP_HOST", "smtp.gmail.com")
    try:
        port = int(os.environ.get("SMTP_PORT", "587"))
    except (TypeError, ValueError):
        port = 587
    # Recipient defaults to the same mailbox (it's the owner's own account); allow
    # ALERT_EMAIL to override if they want alerts delivered elsewhere.
    to_addr = os.environ.get("ALERT_EMAIL") or user
    try:
        msg = MIMEMultipart()
        msg["From"] = user
        msg["To"] = to_addr
        msg["Subject"] = f"[Starta ALERT] {title}"
        msg.attach(MIMEText(str(message), "plain"))
        server = smtplib.SMTP(host, port, timeout=timeout)
        try:
            server.starttls()
            server.login(user, password)
            server.send_message(msg)
        finally:
            try:
                server.quit()
            except Exception:  # noqa: BLE001 — closing must not mask a send result
                pass
        return "ok"
    except Exception as e:  # noqa: BLE001 — best-effort by contract
        return f"error: {type(e).__name__}: {e}"


def send_alert(title: str, message: str) -> dict:
    """Deliver an alert with VERIFIED Discord, falling back to email on failure.

    Order: try Discord and check its HTTP status. If Discord did NOT confirm
    delivery (missing / non-2xx / error), send email instead. Email is also sent
    if Discord is simply not configured. This is best-effort: it NEVER raises.

    Returns a status dict, e.g.::

        {"discord": "ok",        "email": "not_attempted", "delivered": True}
        {"discord": "http 403",  "email": "ok",            "delivered": True}
        {"discord": "skip(no url)", "email": "error: ...", "delivered": False}

    `delivered` is True iff AT LEAST ONE channel confirmed delivery — callers can
    log/inspect it, but should treat the very act of calling send_alert as the
    last line of defense, not assume success.
    """
    status = {"discord": "not_attempted", "email": "not_attempted", "delivered": False}

    discord_status = _send_discord(title, message)
    status["discord"] = discord_status
    discord_ok = discord_status == "ok"

    if discord_ok:
        status["delivered"] = True
    else:
        # Discord failed or wasn't configured — fall back to the independent channel.
        _log(f"Discord not confirmed ({discord_status}); attempting email fallback.")
        email_status = _send_email(title, message)
        status["email"] = email_status
        if email_status == "ok":
            status["delivered"] = True

    if not status["delivered"]:
        # Loud on stderr so even a total-delivery failure leaves a forensic trail in
        # the job log (the one place that is captured even when both channels die).
        _log(f"ALERT NOT DELIVERED via any channel: {status} | title={title!r}")

    return status


if __name__ == "__main__":
    # Minimal CLI: `python scripts/notify.py "title" "body"` — exercises BOTH the
    # Discord verification and the email fallback path for a quick manual test.
    _title = sys.argv[1] if len(sys.argv) > 1 else "Starta notify.py self-test"
    _message = sys.argv[2] if len(sys.argv) > 2 else "If you received this, the alert path works."
    _result = send_alert(_title, _message)
    print(json.dumps(_result))
    # Non-zero exit only if NOTHING delivered, so a human/CI test fails loudly.
    sys.exit(0 if _result.get("delivered") else 1)
