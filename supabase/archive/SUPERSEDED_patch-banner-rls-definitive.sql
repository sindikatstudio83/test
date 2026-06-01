-- ═══════════════════════════════════════════════════════════════════════════
-- imaposla.me — DEFINITIVNI FIX: banner_requests INSERT
-- Fajl: supabase-patch-banner-rls-definitive.sql
-- Datum: 2026-05-19
--
-- Popravlja zašto firma ne može poslati banner zahtjev.
--
-- ROOT UZROCI (svi pokriveni ovim patchom):
--   1. br_company polisa ima USING ali ne WITH CHECK → INSERT blokiran
--   2. br_admin polisa koristi public.is_admin() koja možda ne postoji
--      u svim okruženjima (namespace problem)
--   3. banner_requests tabela možda nema RLS enabled
--
-- POKRETANJE: Supabase Dashboard → SQL Editor → Run
-- Idempotentno.
-- ═══════════════════════════════════════════════════════════════════════════

-- Osiguraj da je RLS enabled na tabeli
ALTER TABLE public.banner_requests ENABLE ROW LEVEL SECURITY;

-- ── Obriši sve postojeće polise i kreni čisto ──────────────────────────────
DROP POLICY IF EXISTS "br_company"              ON public.banner_requests;
DROP POLICY IF EXISTS "br_admin"                ON public.banner_requests;
DROP POLICY IF EXISTS "banner_requests_company" ON public.banner_requests;
DROP POLICY IF EXISTS "banner_requests_admin"   ON public.banner_requests;

-- ── Firma: vlasnik kompanije može INSERT, SELECT, UPDATE vlastite zahtjeve ──
-- WITH CHECK osigurava da firma može ubaciti novi red (INSERT),
-- USING osigurava da vidi samo vlastite zahtjeve (SELECT/UPDATE).
CREATE POLICY "br_company" ON public.banner_requests
  FOR ALL
  TO authenticated
  USING (
    company_id IN (
      SELECT id FROM public.companies
      WHERE owner_id = auth.uid()
    )
  )
  WITH CHECK (
    company_id IN (
      SELECT id FROM public.companies
      WHERE owner_id = auth.uid()
    )
  );

-- ── Admin: puni pristup ────────────────────────────────────────────────────
-- Koristimo direktnu provjeru na profiles.role umjesto is_admin()
-- jer is_admin() možda nije dostupna u svim namespace-ovima.
CREATE POLICY "br_admin" ON public.banner_requests
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
        AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
        AND role = 'admin'
    )
  );

-- ── Verifikacija (pokrenuti odvojeno da provjeriš rezultat) ────────────────
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
-- FROM pg_policies
-- WHERE tablename = 'banner_requests';
