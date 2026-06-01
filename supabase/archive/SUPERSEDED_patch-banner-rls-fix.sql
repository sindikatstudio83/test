-- ═══════════════════════════════════════════════════════════════════════════
-- imaposla.me — PATCH: banner_requests RLS + navigation fix
-- Fajl: supabase-patch-banner-rls-fix.sql
-- Datum: 2026-05-19
--
-- PROBLEM: br_company RLS polisa ima samo USING klauzu, bez WITH CHECK.
-- U PostgreSQL-u, USING se primjenjuje na SELECT/UPDATE/DELETE row filter,
-- ali za INSERT je potrebna WITH CHECK klauza.
-- Bez nje, firma ne može da ubaci novi banner zahtjev (silent fail ili error).
--
-- POKRETANJE:
--   Supabase Dashboard → SQL Editor → Paste → Run
--   Idempotentno (DROP IF EXISTS + CREATE).
-- ═══════════════════════════════════════════════════════════════════════════

-- Popravi br_company: dodaj WITH CHECK za INSERT
DROP POLICY IF EXISTS "br_company" ON public.banner_requests;
CREATE POLICY "br_company" ON public.banner_requests
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.companies
      WHERE id = banner_requests.company_id
        AND owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.companies
      WHERE id = banner_requests.company_id
        AND owner_id = auth.uid()
    )
  );

-- Popravi br_admin ako koristi public.is_admin (treba biti private.is_admin)
-- Provjeri koji namespace koristiš — zamijeni ako treba
DROP POLICY IF EXISTS "br_admin" ON public.banner_requests;
CREATE POLICY "br_admin" ON public.banner_requests
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
