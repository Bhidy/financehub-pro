-- ============================================================
-- MIGRATION 007: fix the "Security Definer View" advisor errors (2026-07-02)
-- ============================================================
-- A Postgres view without security_invoker runs with the privileges of its OWNER
-- ('postgres'), which can BYPASS RLS on the underlying tables when the view is
-- queried through the anon/REST API. Setting security_invoker=on makes the view
-- run with the CALLER's privileges, so it respects RLS.
--
-- SAFETY: the app connects as owner 'postgres' and bypasses RLS regardless, so
-- this does NOT change app behaviour — it only constrains anon/authenticated to
-- what RLS on the base tables already allows. Idempotent (only flips views that
-- aren't already security_invoker=true).
-- ============================================================
DO $$
DECLARE v record;
BEGIN
  FOR v IN
    SELECT c.relname
    FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind = 'v'
      AND NOT ('security_invoker=true' = ANY (coalesce(c.reloptions, '{}')))
  LOOP
    EXECUTE format('ALTER VIEW public.%I SET (security_invoker = on)', v.relname);
    RAISE NOTICE 'security_invoker=on -> public.%', v.relname;
  END LOOP;
END $$;
