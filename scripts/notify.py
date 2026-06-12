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
  Webhook:  ALERT_WEBHOOK_URL   — generic JSON POST ({"text": ...}); Slack-incoming-
            webhook compatible. Set the secret and the channel is live, no code change.
  Email:    NOTIFICATION_EMAIL  — Gmail address; used as SMTP login, From AND To.
            SMTP_PASSWORD       — Gmail App Password (myaccount.google.com/apppasswords).
            Optional overrides (same names backend-core's notification_service.py
            already honors): SMTP_HOST (default smtp.gmail.com), SMTP_PORT (587),
            ALERT_EMAIL (recipient, if it must differ from NOTIFICATION_EMAIL).
  GitHub:   GH_TOKEN or GITHUB_TOKEN + GITHUB_REPOSITORY. NOTE: the calling
            workflow must BOTH grant `permissions: issues: write` AND pass the
            token env explicitly (GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}) — only
            GITHUB_REPOSITORY is truly auto-present. Creates/updates a GitHub
            ISSUE titled like the alert — the guaranteed last-resort channel
            (no external credentials; GitHub pushes mobile/email natively).
            Repeated alerts with the same title COMMENT on the existing open
            issue (no issue spam).

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


def _gh_api(method: str, path: str, token: str, payload=None, timeout: int = 20):
    """Minimal stdlib GitHub REST call. Returns (status_code, parsed_json|None)."""
    url = f"https://api.github.com{path}"
    data = json.dumps(payload).encode() if payload is not None else None
    req = urllib.request.Request(url, data=data, method=method, headers={
        "Authorization": f"Bearer {token}",
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "Content-Type": "application/json",
    })
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        body = resp.read()
        return resp.getcode(), (json.loads(body) if body else None)


def _send_github_issue(title: str, message: str) -> str:
    """File the alert as a GitHub issue (or comment on the open issue of the same
    title). Needs GH_TOKEN/GITHUB_TOKEN + GITHUB_REPOSITORY — both present in any
    Actions run — and `issues: write` permission in the calling workflow. This is
    the zero-external-dependency channel: GitHub itself then pushes mobile/email
    notifications to the owner. NEVER raises.
    """
    # Try BOTH tokens: GH_TOKEN may be a fine-grained PAT scoped to actions:write
    # only (the watchdog dispatch token), which CANNOT create issues — fall back
    # to the workflow GITHUB_TOKEN in that case.
    tokens = [t for t in (os.environ.get("GH_TOKEN"), os.environ.get("GITHUB_TOKEN")) if t]
    tokens = list(dict.fromkeys(tokens))  # dedupe, keep order
    repo = os.environ.get("GH_REPO") or os.environ.get("GITHUB_REPOSITORY")
    if not tokens or not repo:
        return "skip(no token/repo)"
    issue_title = f"🔴 Pipeline alert: {title}"
    run_url = ""
    if os.environ.get("GITHUB_SERVER_URL") and os.environ.get("GITHUB_RUN_ID"):
        run_url = (f"\n\nRun: {os.environ['GITHUB_SERVER_URL']}/{repo}"
                   f"/actions/runs/{os.environ['GITHUB_RUN_ID']}")
    body = f"{message}{run_url}\n\n_Auto-filed by scripts/notify.py — close after resolving._"
    last = "error: no token attempted"
    for token in tokens:
        try:
            # Re-use the open issue with the same title so a repeating condition
            # threads into ONE issue instead of spamming a new issue per run.
            code, issues = _gh_api("GET", f"/repos/{repo}/issues?state=open&per_page=100", token)
            existing = None
            if code == 200 and isinstance(issues, list):
                existing = next((i for i in issues
                                 if i.get("title") == issue_title and "pull_request" not in i), None)
            if existing:
                code, _ = _gh_api("POST", f"/repos/{repo}/issues/{existing['number']}/comments",
                                  token, {"body": body})
                result = (f"ok(comment on #{existing['number']})"
                          if 200 <= code < 300 else f"http {code}")
            else:
                code, created = _gh_api("POST", f"/repos/{repo}/issues", token,
                                        {"title": issue_title, "body": body})
                if 200 <= code < 300 and isinstance(created, dict):
                    result = f"ok(issue #{created.get('number')})"
                else:
                    result = f"http {code}"
        except urllib.error.HTTPError as e:
            # 401/403 = this token lacks Issues scope (e.g. a dispatch-only PAT in
            # GH_TOKEN) or the workflow lacks `permissions: issues: write` — the
            # loop retries with the next token (the workflow GITHUB_TOKEN).
            result = f"http {e.code}"
        except Exception as e:  # noqa: BLE001 — best-effort by contract
            result = f"error: {type(e).__name__}: {e}"
        if result.startswith("ok"):
            return result
        last = result
    return last


def _send_webhook(title: str, message: str, timeout: int = 15) -> str:
    """Generic JSON webhook ({"text": ...}) — Slack incoming-webhook compatible.
    Configured via ALERT_WEBHOOK_URL; absent means skip. NEVER raises."""
    url = os.environ.get("ALERT_WEBHOOK_URL")
    if not url:
        return "skip(no url)"
    try:
        body = json.dumps({"text": f"🚨 {title}\n{message}"[:3900]}).encode()
        req = urllib.request.Request(url, data=body, headers={"Content-Type": "application/json"})
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            code = resp.getcode()
        return "ok" if (code is not None and 200 <= code < 300) else f"http {code}"
    except urllib.error.HTTPError as e:
        return f"http {e.code}"
    except Exception as e:  # noqa: BLE001 — best-effort by contract
        return f"error: {type(e).__name__}: {e}"


def send_alert(title: str, message: str) -> dict:
    """Deliver an alert through the first channel that CONFIRMS delivery.

    Chain (each step verified, each skipped if unconfigured):
        Discord → generic webhook (ALERT_WEBHOOK_URL) → email (SMTP) → GitHub issue.

    The GitHub-issue channel is the designed last resort: inside any Actions run it
    needs no external credentials at all, so "ALERT NOT DELIVERED via any channel"
    should now be impossible in CI as long as the workflow grants
    `permissions: issues: write`. Best-effort by contract: NEVER raises.

    Returns a status dict, e.g.::

        {"discord": "skip(no url)", "webhook": "skip(no url)",
         "email": "skip(...)", "github_issue": "ok(issue #12)", "delivered": True}

    `delivered` is True iff AT LEAST ONE channel confirmed delivery.
    """
    status = {"discord": "not_attempted", "webhook": "not_attempted",
              "email": "not_attempted", "github_issue": "not_attempted",
              "delivered": False}

    chain = (("discord", _send_discord), ("webhook", _send_webhook),
             ("email", _send_email), ("github_issue", _send_github_issue))
    for name, sender in chain:
        result = sender(title, message)
        status[name] = result
        if result.startswith("ok"):
            status["delivered"] = True
            break
        _log(f"{name} not confirmed ({result}); trying next channel.")

    if not status["delivered"]:
        # Loud on stderr so even a total-delivery failure leaves a forensic trail in
        # the job log (the one place that is captured even when all channels die).
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
