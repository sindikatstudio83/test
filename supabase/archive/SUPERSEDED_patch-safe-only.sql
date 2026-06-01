-- ═══════════════════════════════════════════════════════════════════════════
-- imaposla.me — SAFE PATCH: search_path only
-- Fajl: supabase-patch-safe-only.sql
-- Datum: 2026-05-19
--
-- Nulti uticaj na funkcionalnost sajta.
-- Samo zakopčava search_path na 4 trigger funkcije.
-- ═══════════════════════════════════════════════════════════════════════════

ALTER FUNCTION public.set_updated_at()         SET search_path = public;
ALTER FUNCTION public.trigger_set_updated_at() SET search_path = public;
ALTER FUNCTION public.banners_updated_at_trigger() SET search_path = public;
ALTER FUNCTION public.expire_job_promotions()  SET search_path = public;
