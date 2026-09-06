"""
PRICE ALERT EVALUATOR AND DELIVERY
==================================

WHY THIS FILE EXISTS
--------------------
`/user/alerts` has had full CRUD since the account system was built. It writes a
row into `price_alerts` and nothing has ever read that table. There was no job
comparing a target against a price and no path that delivered anything: the
`notification_service` in this package sends OPERATIONAL mail to the team about
scheduled jobs, not alerts to users.

So the product could take an alert and silently do nothing with it forever. The
registration strategy deliberately refused to put a gate in front of alerts for
exactly that reason — a gate that trades an account for "we will tell you when
this share hits your level" and then never tells them is worse than no gate.
This closes the loop so the gate can be honest.

THE FOUR RULES THIS EVALUATOR OBEYS
-----------------------------------
1. NEVER FIRE ON A STALE PRICE. The site treats a quote as unusable after 14
   days, which is the right threshold for DISPLAYING a company row and a
   ludicrous one for an alert: "COMI crossed 150" computed from a twelve-day-old
   number is a false statement sent to someone who trusted us to watch. This job
   runs during and just after the trading session and refuses any quote older
   than ALERT_MAX_PRICE_AGE_HOURS. A missing or stale price is not a failure —
   the alert simply stays armed.

2. FIRE ONCE. The row is CLAIMED with a conditional UPDATE before any mail is
   sent, so two overlapping runs cannot both take it. If delivery then fails the
   claim is released and the attempt counted, giving at-least-once with a bound;
   after MAX_NOTIFY_ATTEMPTS the alert is retired rather than retried forever
   against a dead mailbox.

3. RESPECT THE PREFERENCE. A user who has switched price alerts off in settings
   is not evaluated at all, and their alerts stay armed. Marking them triggered
   while silently not sending would quietly destroy alerts they had set, and
   they would find them gone when they turned notifications back on.

4. SAY WHAT ACTUALLY HAPPENED. The email carries the symbol, the level that was
   set, the price that crossed it and the timestamp of that price. An alert that
   says only "your alert triggered" makes the reader go and check, which is the
   work they set the alert to avoid.
"""

import logging
from datetime import datetime, timezone
from typing import Any, Dict, List

from app.db.session import db

logger = logging.getLogger(__name__)

# A price older than this is not evidence of anything. The job is scheduled
# inside the trading session, where quotes are minutes old, so this is a
# generous ceiling rather than a working tolerance. It is deliberately NOT the
# site's 14-day display threshold — see rule 1.
ALERT_MAX_PRICE_AGE_HOURS = 6

# Delivery is retried, but not forever: a permanently undeliverable address
# should not be mailed every five minutes for the rest of time.
MAX_NOTIFY_ATTEMPTS = 3


async def ensure_schema() -> None:
    """
    Add the columns the evaluator needs, idempotently.

    `price_alerts` predates this file and is not created by any migration in the
    repository — it exists in the database and only `004_enable_rls_all_tables`
    references it. Rather than guess its full shape, this adds what is missing
    and leaves everything else alone.
    """
    statements = [
        """
        CREATE TABLE IF NOT EXISTS price_alerts (
            id SERIAL PRIMARY KEY,
            user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
            symbol VARCHAR(32) NOT NULL,
            target_price NUMERIC NOT NULL,
            condition VARCHAR(8) NOT NULL,
            is_active BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
        """,
        # The evaluator's own bookkeeping. Every one is additive, so this is safe
        # against whatever shape the live table already has.
        "ALTER TABLE price_alerts ADD COLUMN IF NOT EXISTS triggered_at TIMESTAMP WITH TIME ZONE",
        "ALTER TABLE price_alerts ADD COLUMN IF NOT EXISTS triggered_price NUMERIC",
        "ALTER TABLE price_alerts ADD COLUMN IF NOT EXISTS notified_at TIMESTAMP WITH TIME ZONE",
        "ALTER TABLE price_alerts ADD COLUMN IF NOT EXISTS notify_attempts INTEGER DEFAULT 0",
        "ALTER TABLE price_alerts ADD COLUMN IF NOT EXISTS last_error TEXT",
        # The evaluator's read path: active alerts only.
        "CREATE INDEX IF NOT EXISTS idx_price_alerts_active ON price_alerts(is_active) WHERE is_active",
        "CREATE INDEX IF NOT EXISTS idx_price_alerts_user ON price_alerts(user_id)",
    ]
    # db.execute(), not db._pool — the pool is private and, importantly, the
    # helper returns quietly when the pool is not up yet, which is exactly the
    # behaviour wanted at startup.
    for statement in statements:
        try:
            await db.execute(statement)
        except Exception as exc:  # pragma: no cover - startup resilience
            logger.error("[alerts] schema statement failed (%s): %s", statement.split("\n")[0][:60], exc)
            return
    logger.info("[alerts] schema ensured")


async def _due_alerts() -> List[Dict[str, Any]]:
    """
    Active alerts whose condition is met against a FRESH quote, for users who
    still want price alerts.

    The freshness test and the condition test are both in SQL so a row can never
    be selected on a stale price by a later code path forgetting to check.

    `user_notification_settings` is LEFT JOINed and NULL is treated as opted in,
    matching the column default (`price_alerts BOOLEAN DEFAULT TRUE`) — a user
    who has never opened settings has not opted out.
    """
    query = """
        SELECT
            a.id,
            a.symbol,
            a.target_price,
            a.condition,
            a.notify_attempts,
            u.email,
            u.full_name,
            t.last_price,
            t.last_updated,
            COALESCE(t.name_en, a.symbol) AS name_en,
            t.name_ar
        FROM price_alerts a
        JOIN users u ON u.id = a.user_id
        JOIN market_tickers t ON t.symbol = a.symbol
        LEFT JOIN user_notification_settings s ON s.user_id = a.user_id
        WHERE a.is_active IS TRUE
          AND u.is_active IS TRUE
          AND u.email IS NOT NULL
          AND COALESCE(s.price_alerts, TRUE) IS TRUE
          AND a.notify_attempts < $2
          AND t.last_price IS NOT NULL
          -- RULE 1: never fire on a stale quote.
          AND t.last_updated IS NOT NULL
          AND t.last_updated > NOW() - ($1 || ' hours')::interval
          AND (
                (a.condition = 'ABOVE' AND t.last_price >= a.target_price)
             OR (a.condition = 'BELOW' AND t.last_price <= a.target_price)
          )
    """
    return await db.fetch_all(query, str(ALERT_MAX_PRICE_AGE_HOURS), MAX_NOTIFY_ATTEMPTS)


async def _claim(alert_id: int, price: float) -> bool:
    """
    Take ownership of an alert before sending anything.

    RULE 2. The `is_active IS TRUE` in the WHERE clause is the whole mechanism:
    whichever run updates the row first gets the row, and any overlapping run
    updates nothing and returns None. Without this, two scheduler instances — or
    one slow run overlapping the next — would both send.
    """
    row = await db.fetch_one(
        """
        UPDATE price_alerts
           SET is_active = FALSE,
               triggered_at = NOW(),
               triggered_price = $2::numeric,
               notify_attempts = COALESCE(notify_attempts, 0) + 1
         WHERE id = $1 AND is_active IS TRUE
        RETURNING id
        """,
        alert_id,
        price,
    )
    return bool(row)


async def _release(alert_id: int, error: str) -> None:
    """
    Put a claimed alert back after a failed send, so the next run retries it.

    `notify_attempts` is NOT decremented — that counter is what stops an
    undeliverable address being retried forever, and the query above stops
    selecting the row once it reaches MAX_NOTIFY_ATTEMPTS.
    """
    await db.execute(
        """
        UPDATE price_alerts
           SET is_active = TRUE,
               triggered_at = NULL,
               triggered_price = NULL,
               last_error = $2
         WHERE id = $1
        """,
        alert_id,
        error[:500],
    )


def _subject(symbol: str, condition: str, target: float) -> str:
    direction = "above" if condition == "ABOVE" else "below"
    return f"{symbol} is {direction} {target:,.2f} EGP"


def _body(name: str, row: Dict[str, Any]) -> str:
    """
    RULE 4: the email states the level, the price that crossed it, and WHEN that
    price was observed. A reader should not have to open the site to learn what
    happened — that is the errand the alert existed to save.
    """
    symbol = row["symbol"]
    company = row.get("name_en") or symbol
    target = float(row["target_price"])
    price = float(row["last_price"])
    direction = "risen above" if row["condition"] == "ABOVE" else "fallen below"
    observed = row.get("last_updated")
    observed_text = (
        observed.strftime("%d %b %Y, %H:%M") if isinstance(observed, datetime) else str(observed or "")
    )
    url = f"https://startamarkets.com/symbol/{symbol}"

    return f"""<!doctype html>
<html><body style="margin:0;padding:24px;background:#f6f8fb;font-family:'Manrope',Arial,sans-serif;color:#111827">
  <div style="max-width:520px;margin:0 auto;background:#fff;border:1px solid rgba(148,163,184,.2);border-radius:16px;padding:28px">
    <div style="display:inline-block;width:34px;height:34px;line-height:34px;text-align:center;border-radius:8px;background:#14B8A6;color:#fff;font-weight:700">S</div>
    <h1 style="font-size:19px;margin:18px 0 6px">{company} has {direction} your level</h1>
    <p style="margin:0 0 20px;color:#5c6676;font-size:14px;line-height:1.6">
      You asked to be told when {symbol} went {'above' if row['condition'] == 'ABOVE' else 'below'} {target:,.2f} EGP.
    </p>
    <table style="width:100%;border-collapse:collapse;font-size:14px">
      <tr><td style="padding:8px 0;color:#5c6676">Your level</td><td style="padding:8px 0;text-align:right;font-weight:700">{target:,.2f} EGP</td></tr>
      <tr><td style="padding:8px 0;color:#5c6676">Latest price</td><td style="padding:8px 0;text-align:right;font-weight:700">{price:,.2f} EGP</td></tr>
      <tr><td style="padding:8px 0;color:#5c6676">Price observed</td><td style="padding:8px 0;text-align:right">{observed_text}</td></tr>
    </table>
    <p style="margin:24px 0 0">
      <a href="{url}" style="display:inline-block;background:#14B8A6;color:#fff;text-decoration:none;padding:11px 22px;border-radius:999px;font-weight:700;font-size:13px">Open {symbol}</a>
    </p>
    <p style="margin:22px 0 0;color:#94a3b8;font-size:12px;line-height:1.6">
      This alert has now been used and will not be sent again. Set another on the
      company's page at any time. Price alerts can be switched off in your
      account settings.
    </p>
  </div>
</body></html>"""


async def evaluate_alerts() -> Dict[str, Any]:
    """
    One pass. Safe to run every few minutes; safe to run twice at once.

    Returns a summary the scheduler logs, so a silent no-op is distinguishable
    from a run that found nothing due.
    """
    summary = {"checked": 0, "sent": 0, "failed": 0, "skipped_claim": 0}
    try:
        rows = await _due_alerts()
    except Exception as exc:
        logger.error("[alerts] query failed: %s", exc)
        return {**summary, "error": str(exc)}

    summary["checked"] = len(rows)
    if not rows:
        return summary

    # Imported here, not at module scope: the newsletter service pulls in the
    # template stack and HTTP client, and this module is imported by the
    # scheduler at startup where an import loop would take the API down with it.
    from app.services.newsletter_service import newsletter_service

    for row in rows:
        alert_id = row["id"]
        price = float(row["last_price"])

        if not await _claim(alert_id, price):
            # Another run took it. Not an error.
            summary["skipped_claim"] += 1
            continue

        name = (row.get("full_name") or row["email"].split("@")[0]).strip()
        try:
            result = await newsletter_service._send_email(
                row["email"],
                _subject(row["symbol"], row["condition"], float(row["target_price"])),
                _body(name, dict(row)),
            )
            if result.get("success"):
                await db.execute("UPDATE price_alerts SET notified_at = NOW() WHERE id = $1", alert_id)
                summary["sent"] += 1
            else:
                await _release(alert_id, str(result.get("error") or "send failed"))
                summary["failed"] += 1
        except Exception as exc:
            await _release(alert_id, str(exc))
            summary["failed"] += 1
            logger.error("[alerts] delivery failed for alert %s: %s", alert_id, exc)

    logger.info(
        "[alerts] checked=%s sent=%s failed=%s skipped=%s",
        summary["checked"], summary["sent"], summary["failed"], summary["skipped_claim"],
    )
    return summary
