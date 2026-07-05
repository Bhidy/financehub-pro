"""
Feedback write SQL — pure, import-free constants so BOTH the endpoint (funds.py) and
the QA write-contract probe (qa/egx_audit.py) reference the EXACT same statements.
AGENTS.md requires any widened/new write SQL to be covered by the write-contract gate;
keeping the statements here (no app/asyncpg imports) lets the probe load them without
pulling the FastAPI app into the contract CI job.
"""

FEEDBACK_DDL = """
CREATE TABLE IF NOT EXISTS fund_feedback (
    id          BIGSERIAL PRIMARY KEY,
    fund_id     TEXT NOT NULL,
    helpful     BOOLEAN NOT NULL,
    comment     TEXT,
    fingerprint TEXT,
    user_agent  TEXT,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_fund_feedback_fund ON fund_feedback (fund_id);
"""

FEEDBACK_SELECT_RECENT = (
    "SELECT id FROM fund_feedback WHERE fund_id = $1 AND fingerprint = $2 "
    "AND created_at > NOW() - INTERVAL '2 days' ORDER BY created_at DESC LIMIT 1"
)

FEEDBACK_UPDATE = (
    "UPDATE fund_feedback SET helpful = $2, comment = COALESCE($3, comment), "
    "created_at = NOW() WHERE id = $1"
)

FEEDBACK_INSERT = (
    "INSERT INTO fund_feedback (fund_id, helpful, comment, fingerprint, user_agent) "
    "VALUES ($1, $2, $3, $4, $5)"
)

FEEDBACK_SUMMARY = (
    "SELECT COUNT(*) AS total, "
    "COUNT(*) FILTER (WHERE helpful) AS helpful, "
    "COUNT(*) FILTER (WHERE NOT helpful) AS not_helpful "
    "FROM fund_feedback WHERE fund_id = $1"
)
