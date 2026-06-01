-- ============================================================
-- imaposla.me — Performance & Query Optimization
-- Pokrenuti u Supabase SQL Editoru
-- ============================================================

-- 1. INDEKSI za najčešće upite

-- jobs tabela — filteri po statusu, grad, kategorija, datum
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_status_created ON jobs(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_jobs_company_id ON jobs(company_id);
CREATE INDEX IF NOT EXISTS idx_jobs_city_id ON jobs(city_id);
CREATE INDEX IF NOT EXISTS idx_jobs_category_id ON jobs(category_id);
CREATE INDEX IF NOT EXISTS idx_jobs_featured ON jobs(featured, status);
CREATE INDEX IF NOT EXISTS idx_jobs_deadline ON jobs(deadline);

-- job_applications — kandidatove prijave, firmini pregledi
CREATE INDEX IF NOT EXISTS idx_apps_candidate ON job_applications(candidate_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_apps_job ON job_applications(job_id);
CREATE INDEX IF NOT EXISTS idx_apps_stage ON job_applications(stage);

-- profiles — role lookup (najtrafičniji upit)
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);

-- companies — javni prikaz
CREATE INDEX IF NOT EXISTS idx_companies_approved ON companies(approved, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_companies_owner ON companies(owner_id);
CREATE INDEX IF NOT EXISTS idx_companies_slug ON companies(slug);

-- orders & payment_proofs — admin pregled
CREATE INDEX IF NOT EXISTS idx_orders_company ON orders(company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_proofs_status ON payment_proofs(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_proofs_company ON payment_proofs(company_id);

-- 2. LOOKUP VIEW — gradovi i kategorije za filter (kešuje se)
CREATE OR REPLACE VIEW public.lookup_cities AS
  SELECT id, name, slug FROM cities ORDER BY name;

CREATE OR REPLACE VIEW public.lookup_categories AS
  SELECT id, name, slug FROM categories ORDER BY name;

-- 3. ACTIVE JOBS VIEW — najčešće korišten upit
CREATE OR REPLACE VIEW public.active_jobs AS
  SELECT
    j.id, j.title, j.slug, j.description,
    j.contract_type, j.salary_text, j.deadline,
    j.status, j.featured, j.company_id, j.created_at,
    c.id   AS company_id_fk,
    c.name AS company_name,
    c.slug AS company_slug,
    cat.id   AS category_id_fk,
    cat.name AS category_name,
    ci.id   AS city_id_fk,
    ci.name AS city_name
  FROM jobs j
  LEFT JOIN companies c ON c.id = j.company_id
  LEFT JOIN categories cat ON cat.id = j.category_id
  LEFT JOIN cities ci ON ci.id = j.city_id
  WHERE j.status = 'active'
  ORDER BY j.featured DESC, j.created_at DESC;

-- 4. STATS VIEW za admin dashboard (ne računaj svaki put)
CREATE OR REPLACE VIEW public.platform_stats AS
  SELECT
    (SELECT COUNT(*) FROM jobs WHERE status = 'active') AS active_jobs,
    (SELECT COUNT(*) FROM jobs WHERE status = 'pending_review') AS pending_jobs,
    (SELECT COUNT(*) FROM companies WHERE approved = true) AS approved_companies,
    (SELECT COUNT(*) FROM companies WHERE approved = false) AS pending_companies,
    (SELECT COUNT(*) FROM profiles) AS total_users,
    (SELECT COUNT(*) FROM job_applications) AS total_applications,
    (SELECT COUNT(*) FROM payment_proofs WHERE status = 'pending') AS pending_payments,
    (SELECT COALESCE(SUM(amount_eur), 0) FROM orders WHERE status = 'paid') AS total_revenue;

-- 5. RLS politike — provjeri da su aktivne i ispravne

-- Javni oglasi — čitanje bez auth
DROP POLICY IF EXISTS "Public can read active jobs" ON jobs;
CREATE POLICY "Public can read active jobs" ON jobs
  FOR SELECT USING (status = 'active');

-- Firma vidi SAMO svoje oglase (i kad status nije active)
DROP POLICY IF EXISTS "Company sees own jobs" ON jobs;
CREATE POLICY "Company sees own jobs" ON jobs
  FOR SELECT USING (
    company_id IN (
      SELECT id FROM companies WHERE owner_id = auth.uid()
    )
  );

-- Admin vidi sve
DROP POLICY IF EXISTS "Admin sees all jobs" ON jobs;
CREATE POLICY "Admin sees all jobs" ON jobs
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Firma može insertati/updateati svoje oglase
DROP POLICY IF EXISTS "Company manages own jobs" ON jobs;
CREATE POLICY "Company manages own jobs" ON jobs
  FOR INSERT WITH CHECK (
    company_id IN (SELECT id FROM companies WHERE owner_id = auth.uid())
  );

-- Kandidat vidi SAMO svoje prijave
DROP POLICY IF EXISTS "Candidate sees own applications" ON job_applications;
CREATE POLICY "Candidate sees own applications" ON job_applications
  FOR SELECT USING (candidate_id = auth.uid());

-- Firma vidi prijave NA SVOJE oglase
DROP POLICY IF EXISTS "Company sees applications to own jobs" ON job_applications;
CREATE POLICY "Company sees applications to own jobs" ON job_applications
  FOR SELECT USING (
    job_id IN (
      SELECT j.id FROM jobs j
      JOIN companies c ON c.id = j.company_id
      WHERE c.owner_id = auth.uid()
    )
  );

-- Kandid može insertat prijavu
DROP POLICY IF EXISTS "Candidate can apply" ON job_applications;
CREATE POLICY "Candidate can apply" ON job_applications
  FOR INSERT WITH CHECK (candidate_id = auth.uid());

-- Firma može update stage prijave
DROP POLICY IF EXISTS "Company can update stage" ON job_applications;
CREATE POLICY "Company can update stage" ON job_applications
  FOR UPDATE USING (
    job_id IN (
      SELECT j.id FROM jobs j
      JOIN companies c ON c.id = j.company_id
      WHERE c.owner_id = auth.uid()
    )
  );

-- Korisnik vidi/mijenja SAMO svoj profil
DROP POLICY IF EXISTS "User sees own profile" ON profiles;
CREATE POLICY "User sees own profile" ON profiles
  FOR SELECT USING (id = auth.uid());

DROP POLICY IF EXISTS "User updates own profile" ON profiles;
CREATE POLICY "User updates own profile" ON profiles
  FOR UPDATE USING (id = auth.uid())
  WITH CHECK (
    -- Korisnik NE MOŽE promijeniti svoju ulogu
    role = (SELECT role FROM profiles WHERE id = auth.uid())
  );

-- Admin vidi sve profile
DROP POLICY IF EXISTS "Admin sees all profiles" ON profiles;
CREATE POLICY "Admin sees all profiles" ON profiles
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- 6. SECURITY: Spriječi korisniku da se sam postavi za admina
-- Trigger koji blokira role promjenu kroz klijent
CREATE OR REPLACE FUNCTION prevent_role_escalation()
RETURNS TRIGGER AS $$
BEGIN
  -- Dozvoli promjenu role SAMO adminu
  IF OLD.role IS DISTINCT FROM NEW.role THEN
    IF NOT EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    ) THEN
      RAISE EXCEPTION 'Promjena uloge nije dozvoljena.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_prevent_role_escalation ON profiles;
CREATE TRIGGER trg_prevent_role_escalation
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION prevent_role_escalation();

-- 7. AUTO-CREATE profile na registraciji (ako već nije podešeno)
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  user_role TEXT;
BEGIN
  -- Uzmi role iz metadata, ali validiraj — NIKAD admin iz signup
  user_role := NEW.raw_user_meta_data->>'role';
  IF user_role NOT IN ('candidate', 'company') THEN
    user_role := 'candidate';
  END IF;

  INSERT INTO profiles (id, role, email)
  VALUES (NEW.id, user_role, NEW.email)
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- 8. ANALIZA — provjeri najsporije upite
-- Pokrenuti po potrebi:
-- EXPLAIN ANALYZE SELECT * FROM jobs WHERE status = 'active' ORDER BY created_at DESC LIMIT 10;
-- EXPLAIN ANALYZE SELECT * FROM job_applications WHERE candidate_id = 'uuid';

