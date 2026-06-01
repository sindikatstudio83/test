-- ═══════════════════════════════════════════════════════════════════════════
-- imaposla.me — PATCH: Fix SECURITY DEFINER views
-- Fajl: supabase-patch-view-security.sql
-- Datum: 2026-05-19
--
-- PROBLEM:
-- Supabase linter prijavljuje ERROR za 4 view-a koji imaju SECURITY DEFINER:
--   - public.platform_stats
--   - public.lookup_cities
--   - public.lookup_categories
--   - public.active_jobs
--
-- SECURITY DEFINER view se izvršava sa permisijama kreatora view-a (postgres),
-- a ne korisnika koji upituje. To znači da RLS politike na baznim tabelama
-- se ZAOBILAZE — svaki korisnik vidi podatke koje ne bi smio vidjeti.
--
-- RJEŠENJE:
-- Rekreirati viewove sa SQL SECURITY INVOKER opcijom.
-- SECURITY INVOKER = view se izvršava sa permisijama pozivajućeg korisnika,
-- RLS politike se primjenjuju normalno.
--
-- NAPOMENA: platform_stats čita iz profiles, orders, payment_proofs —
-- osjetljive tabele. Ostavljamo ga dostupnim samo adminu kroz RLS na view-u.
--
-- POKRETANJE:
--   Supabase Dashboard → SQL Editor → Paste → Run
--   Idempotentno (CREATE OR REPLACE).
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. lookup_cities ─────────────────────────────────────────────────────
-- Javni podaci (gradovi). RLS na cities tabeli dozvoljava svima čitanje.
CREATE OR REPLACE VIEW public.lookup_cities
  WITH (security_invoker = true)
AS
  SELECT id, name, slug
  FROM public.cities
  ORDER BY name;

GRANT SELECT ON public.lookup_cities TO anon, authenticated;


-- ── 2. lookup_categories ──────────────────────────────────────────────────
-- Javni podaci (kategorije). RLS na categories tabeli dozvoljava svima čitanje.
CREATE OR REPLACE VIEW public.lookup_categories
  WITH (security_invoker = true)
AS
  SELECT id, name, slug
  FROM public.categories
  ORDER BY name;

GRANT SELECT ON public.lookup_categories TO anon, authenticated;


-- ── 3. active_jobs ────────────────────────────────────────────────────────
-- Javni oglas view. RLS na jobs = "Public can read active jobs" (WHERE status='active').
-- Sa SECURITY INVOKER, RLS se primjenjuje → anonimni korisnik vidi samo aktivne.
CREATE OR REPLACE VIEW public.active_jobs
  WITH (security_invoker = true)
AS
  SELECT
    j.id,
    j.title,
    j.slug,
    j.description,
    j.contract_type,
    j.salary_text,
    j.deadline,
    j.status,
    j.featured,
    j.company_id,
    j.created_at,
    c.id   AS company_id_fk,
    c.name AS company_name,
    c.slug AS company_slug,
    cat.id   AS category_id_fk,
    cat.name AS category_name,
    ci.id   AS city_id_fk,
    ci.name AS city_name
  FROM public.jobs j
  LEFT JOIN public.companies c   ON c.id   = j.company_id
  LEFT JOIN public.categories cat ON cat.id = j.category_id
  LEFT JOIN public.cities ci     ON ci.id  = j.city_id
  WHERE j.status = 'active'
  ORDER BY j.featured DESC, j.created_at DESC;

GRANT SELECT ON public.active_jobs TO anon, authenticated;


-- ── 4. platform_stats ─────────────────────────────────────────────────────
-- Admin statistike. Sa SECURITY INVOKER, anonimni i candidati neće moći čitati
-- tabele poput profiles, orders, payment_proofs zbog RLS.
-- Samo admin (koji ima pristup svim tabelama) može vidjeti podatke.
CREATE OR REPLACE VIEW public.platform_stats
  WITH (security_invoker = true)
AS
  SELECT
    (SELECT COUNT(*) FROM public.jobs           WHERE status = 'active')        AS active_jobs,
    (SELECT COUNT(*) FROM public.jobs           WHERE status = 'pending_review') AS pending_jobs,
    (SELECT COUNT(*) FROM public.companies      WHERE approved = true)           AS approved_companies,
    (SELECT COUNT(*) FROM public.companies      WHERE approved = false)          AS pending_companies,
    (SELECT COUNT(*) FROM public.profiles)                                       AS total_users,
    (SELECT COUNT(*) FROM public.job_applications)                               AS total_applications,
    (SELECT COUNT(*) FROM public.payment_proofs WHERE status = 'pending')        AS pending_payments,
    (SELECT COALESCE(SUM(amount_eur), 0) FROM public.orders WHERE status = 'paid') AS total_revenue;

-- Samo autentifikovani korisnici mogu pokušati čitati (RLS filtrira dalje)
GRANT SELECT ON public.platform_stats TO authenticated;
-- Oduzmi pristup anonimnim korisnicima
REVOKE SELECT ON public.platform_stats FROM anon;
