-- ============================================================
-- MIGRATION 006: close the RLS gap the Security Advisor flagged (2026-07-02)
-- ============================================================
-- Evidence (scripts/security_triage.py, 2026-07-02): 11 public tables had RLS
-- OFF and were confirmed anon-readable via the PostgREST/Data API. This finishes
-- what migration 004 started (004 covered ~83 tables; these 11 were missed or
-- added later).
--
-- SAFETY: the app connects as role 'postgres', which OWNS these tables and so
-- BYPASSES RLS (no FORCE ROW LEVEL SECURITY). Enabling RLS therefore does NOT
-- affect the backend/frontend — it only closes the anon/REST hole. Idempotent:
-- safe to re-run.
-- ============================================================

-- (A) PUBLIC MARKET DATA — keep anon READ (same posture as the ~83 tables
--     migration 004 already made public-read), but block writes (SELECT-only
--     policy → no anon INSERT/UPDATE/DELETE).
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'egx_company_profile_v2','egx_dividends','egx_estimates','egx_financials',
    'egx_fundamentals','egx_news','egx_technicals','symbol_map'
  ] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS "Public read access" ON public.%I', t);
    EXECUTE format('CREATE POLICY "Public read access" ON public.%I FOR SELECT TO anon, authenticated USING (true)', t);
  END LOOP;
END $$;

-- (B) INTERNAL OPS TABLES — anon must have NO access at all (RLS on + no policy
--     = deny-all to anon/authenticated; only the owner/service_role reaches them).
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['egx_ingest_deadletter','fund_sync_runs','pipeline_heartbeat'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS "Public read access" ON public.%I', t);
  END LOOP;
END $$;
