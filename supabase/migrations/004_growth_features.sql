-- =============================================================
-- imaposla.me — Growth Features Migration 2026-05
-- Pokrenuti NAKON svih postojećih migracija (zadnja: supabase-live-hardening-2026-05-05.sql)
-- Svaki blok je idempotent — sigurno za ponovljeno pokretanje.
-- =============================================================

-- ── 0. UTILITY: updated_at trigger function ───────────────────
CREATE OR REPLACE FUNCTION public.trigger_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ── 1. COMPANIES — proširenja ─────────────────────────────────
ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS recommended           boolean     NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS recommended_priority  integer     NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS instagram_url         text,
  ADD COLUMN IF NOT EXISTS updated_at            timestamptz NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_companies_recommended
  ON public.companies (recommended DESC, recommended_priority DESC)
  WHERE approved = true;

DROP TRIGGER IF EXISTS set_updated_at_companies ON public.companies;
CREATE TRIGGER set_updated_at_companies
  BEFORE UPDATE ON public.companies
  FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();

-- ── 2. JOBS — proširenja za brze poslove ─────────────────────
ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS quick_job          boolean      NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS shift_date         date,
  ADD COLUMN IF NOT EXISTS shift_start        time,
  ADD COLUMN IF NOT EXISTS shift_end          time,
  ADD COLUMN IF NOT EXISTS daily_rate         numeric(10,2),
  ADD COLUMN IF NOT EXISTS urgent             boolean      NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS instagram_post_url text,
  ADD COLUMN IF NOT EXISTS social_promo_note  text;

CREATE INDEX IF NOT EXISTS idx_jobs_quick
  ON public.jobs (quick_job, status, created_at DESC)
  WHERE quick_job = true;

CREATE INDEX IF NOT EXISTS idx_jobs_urgent
  ON public.jobs (urgent, status, created_at DESC)
  WHERE urgent = true;

-- ── 3. JOB_PROMOTIONS — centralni sistem promocija ───────────
CREATE TABLE IF NOT EXISTS public.job_promotions (
  id           bigserial    PRIMARY KEY,
  job_id       bigint       NOT NULL REFERENCES public.jobs(id)      ON DELETE CASCADE,
  company_id   bigint       NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  type         text         NOT NULL CHECK (type IN ('featured','paid_top','homepage_top','urgent')),
  status       text         NOT NULL DEFAULT 'active'
                            CHECK (status IN ('active','paused','expired')),
  priority     integer      NOT NULL DEFAULT 0,
  starts_at    timestamptz  NOT NULL DEFAULT now(),
  ends_at      timestamptz,
  source       text         NOT NULL DEFAULT 'admin'
                            CHECK (source IN ('admin','package','payment','credit')),
  created_by   uuid         REFERENCES auth.users(id),
  created_at   timestamptz  NOT NULL DEFAULT now(),
  updated_at   timestamptz  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_job_promotions_active
  ON public.job_promotions (type, priority DESC, starts_at)
  WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_job_promotions_job
  ON public.job_promotions (job_id, status);

CREATE INDEX IF NOT EXISTS idx_job_promotions_company
  ON public.job_promotions (company_id);

DROP TRIGGER IF EXISTS set_updated_at_job_promotions ON public.job_promotions;
CREATE TRIGGER set_updated_at_job_promotions
  BEFORE UPDATE ON public.job_promotions
  FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();

-- Auto-expire helper (pozvati iz cron ili ručno)
CREATE OR REPLACE FUNCTION public.expire_job_promotions()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE public.job_promotions
  SET status = 'expired', updated_at = now()
  WHERE status = 'active'
    AND ends_at IS NOT NULL
    AND ends_at < now();
END;
$$;

-- ── 4. COMPANY_CV_UNLOCKS ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.company_cv_unlocks (
  id            bigserial    PRIMARY KEY,
  company_id    bigint       NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  candidate_id  uuid         NOT NULL REFERENCES public.profiles(id)  ON DELETE CASCADE,
  unlocked_by   uuid         REFERENCES public.profiles(id),
  credits_spent integer      NOT NULL DEFAULT 1,
  created_at    timestamptz  NOT NULL DEFAULT now(),
  UNIQUE (company_id, candidate_id)
);

CREATE INDEX IF NOT EXISTS idx_cv_unlocks_company
  ON public.company_cv_unlocks (company_id, created_at DESC);

-- ── 5. CREDIT_TRANSACTIONS — ledger ──────────────────────────
CREATE TABLE IF NOT EXISTS public.credit_transactions (
  id               bigserial    PRIMARY KEY,
  company_id       bigint       NOT NULL REFERENCES public.companies(id)  ON DELETE CASCADE,
  subscription_id  bigint       REFERENCES public.subscriptions(id),
  type             text         NOT NULL
                                CHECK (type IN (
                                  'package_activation','cv_unlock','admin_adjustment',
                                  'bonus','refund','promotion_spend','banner_spend'
                                )),
  amount           integer      NOT NULL,
  balance_after    integer      NOT NULL,
  reference_type   text,
  reference_id     text,
  note             text,
  created_by       uuid         REFERENCES public.profiles(id),
  created_at       timestamptz  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_credit_tx_company
  ON public.credit_transactions (company_id, created_at DESC);

-- ── 6. BANNER_REQUESTS ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.banner_requests (
  id                    bigserial    PRIMARY KEY,
  company_id            bigint       NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  title                 text         NOT NULL,
  image_path            text,
  target_url            text,
  requested_placement   text,
  requested_device      text         NOT NULL DEFAULT 'all'
                                     CHECK (requested_device IN ('all','desktop','mobile')),
  requested_start_date  date,
  requested_end_date    date,
  note                  text,
  status                text         NOT NULL DEFAULT 'pending'
                                     CHECK (status IN ('pending','approved','rejected','active','expired')),
  admin_note            text,
  approved_banner_id    bigint       REFERENCES public.banners(id),
  created_by            uuid         REFERENCES public.profiles(id),
  reviewed_by           uuid         REFERENCES public.profiles(id),
  reviewed_at           timestamptz,
  created_at            timestamptz  NOT NULL DEFAULT now(),
  updated_at            timestamptz  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_banner_requests_company
  ON public.banner_requests (company_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_banner_requests_status
  ON public.banner_requests (status, created_at DESC);

DROP TRIGGER IF EXISTS set_updated_at_banner_requests ON public.banner_requests;
CREATE TRIGGER set_updated_at_banner_requests
  BEFORE UPDATE ON public.banner_requests
  FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();

-- ── 7. WORKER_RATINGS — interne ocjene ──────────────────────
CREATE TABLE IF NOT EXISTS public.worker_ratings (
  id           bigserial    PRIMARY KEY,
  company_id   bigint       NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  worker_id    uuid         NOT NULL REFERENCES public.profiles(id)  ON DELETE CASCADE,
  job_id       bigint       REFERENCES public.jobs(id),
  rating       integer      NOT NULL CHECK (rating BETWEEN 1 AND 5),
  tags         text[]       NOT NULL DEFAULT '{}',
  note         text,
  visibility   text         NOT NULL DEFAULT 'private'
                            CHECK (visibility IN ('private','admin_only')),
  created_by   uuid         REFERENCES public.profiles(id),
  created_at   timestamptz  NOT NULL DEFAULT now(),
  updated_at   timestamptz  NOT NULL DEFAULT now(),
  UNIQUE (company_id, worker_id, job_id)
);

CREATE INDEX IF NOT EXISTS idx_worker_ratings_company
  ON public.worker_ratings (company_id);

DROP TRIGGER IF EXISTS set_updated_at_worker_ratings ON public.worker_ratings;
CREATE TRIGGER set_updated_at_worker_ratings
  BEFORE UPDATE ON public.worker_ratings
  FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();

-- ── 8. CREATIVE_TEMPLATES — Canva linkovi ───────────────────
CREATE TABLE IF NOT EXISTS public.creative_templates (
  id            bigserial    PRIMARY KEY,
  name          text         NOT NULL,
  template_url  text         NOT NULL,
  format        text         NOT NULL
                             CHECK (format IN (
                               'instagram_post','instagram_story','facebook_feed',
                               'banner','square','vertical','horizontal'
                             )),
  purpose       text         NOT NULL
                             CHECK (purpose IN (
                               'job_ad','featured_job','paid_top',
                               'company_promo','quick_job','generic'
                             )),
  active        boolean      NOT NULL DEFAULT true,
  created_at    timestamptz  NOT NULL DEFAULT now(),
  updated_at    timestamptz  NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS set_updated_at_creative_templates ON public.creative_templates;
CREATE TRIGGER set_updated_at_creative_templates
  BEFORE UPDATE ON public.creative_templates
  FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();

-- ── 9. CANDIDATE_PROFILES — proširenja za brze poslove ───────
-- candidate_profiles već postoji (supabase-schema.sql) sa skills text[]
ALTER TABLE public.candidate_profiles
  ADD COLUMN IF NOT EXISTS quick_jobs_enabled    boolean      NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS worker_type           text,
  ADD COLUMN IF NOT EXISTS availability          text,
  ADD COLUMN IF NOT EXISTS service_area          text,
  ADD COLUMN IF NOT EXISTS hourly_rate           numeric(10,2),
  ADD COLUMN IF NOT EXISTS daily_rate            numeric(10,2),
  ADD COLUMN IF NOT EXISTS years_experience      integer,
  ADD COLUMN IF NOT EXISTS public_worker_profile boolean      NOT NULL DEFAULT false;

-- ── 10. PLANS — proširenja ────────────────────────────────────
ALTER TABLE public.plans
  ADD COLUMN IF NOT EXISTS featured_jobs_limit       integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS paid_top_positions_limit  integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS banner_requests_limit     integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS quick_jobs_limit          integer NOT NULL DEFAULT 0;

-- ── 11. SUBSCRIPTIONS — updated_at ako ne postoji ───────────
-- (supabase-packages-migration.sql ga je dodao, ovo je safety net)
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- ── 12. RPC: spend_company_credits ───────────────────────────
CREATE OR REPLACE FUNCTION public.spend_company_credits(
  p_company_id      bigint,
  p_amount          integer,
  p_type            text,
  p_reference_type  text DEFAULT NULL,
  p_reference_id    text DEFAULT NULL,
  p_note            text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
DECLARE
  v_sub         record;
  v_new_balance integer;
BEGIN
  SELECT id, unlock_credits_remaining
  INTO v_sub
  FROM public.subscriptions
  WHERE company_id = p_company_id
    AND status = 'active'
    AND unlock_credits_remaining >= p_amount
  ORDER BY created_at DESC
  LIMIT 1
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'insufficient_credits');
  END IF;

  v_new_balance := v_sub.unlock_credits_remaining - p_amount;

  UPDATE public.subscriptions
  SET unlock_credits_remaining = v_new_balance,
      updated_at = now()
  WHERE id = v_sub.id;

  INSERT INTO public.credit_transactions (
    company_id, subscription_id, type, amount,
    balance_after, reference_type, reference_id, note, created_by
  ) VALUES (
    p_company_id, v_sub.id, p_type, -p_amount,
    v_new_balance, p_reference_type, p_reference_id, p_note, auth.uid()
  );

  RETURN jsonb_build_object('success', true, 'balance_after', v_new_balance);
END;
$$;

-- ── 13. RPC: add_company_credits ─────────────────────────────
CREATE OR REPLACE FUNCTION public.add_company_credits(
  p_company_id      bigint,
  p_amount          integer,
  p_type            text DEFAULT 'admin_adjustment',
  p_note            text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
DECLARE
  v_sub         record;
  v_new_balance integer;
BEGIN
  SELECT id, unlock_credits_remaining
  INTO v_sub
  FROM public.subscriptions
  WHERE company_id = p_company_id
    AND status = 'active'
  ORDER BY created_at DESC
  LIMIT 1
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'no_active_subscription');
  END IF;

  v_new_balance := v_sub.unlock_credits_remaining + p_amount;

  UPDATE public.subscriptions
  SET unlock_credits_remaining = v_new_balance,
      updated_at = now()
  WHERE id = v_sub.id;

  INSERT INTO public.credit_transactions (
    company_id, subscription_id, type, amount,
    balance_after, note, created_by
  ) VALUES (
    p_company_id, v_sub.id, p_type, p_amount,
    v_new_balance, p_note, auth.uid()
  );

  RETURN jsonb_build_object('success', true, 'balance_after', v_new_balance);
END;
$$;

-- ── 14. RPC: get_company_credit_balance ──────────────────────
CREATE OR REPLACE FUNCTION public.get_company_credit_balance(p_company_id bigint)
RETURNS integer
LANGUAGE sql SECURITY DEFINER
SET search_path = public AS $$
  SELECT COALESCE(SUM(unlock_credits_remaining), 0)::integer
  FROM public.subscriptions
  WHERE company_id = p_company_id AND status = 'active';
$$;

-- ── 15. RLS ──────────────────────────────────────────────────

-- job_promotions
ALTER TABLE public.job_promotions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "jp_admin_all"   ON public.job_promotions;
CREATE POLICY "jp_admin_all" ON public.job_promotions
  FOR ALL TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "jp_company_own" ON public.job_promotions;
CREATE POLICY "jp_company_own" ON public.job_promotions
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.companies
      WHERE id = job_promotions.company_id
        AND owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "jp_public_active" ON public.job_promotions;
CREATE POLICY "jp_public_active" ON public.job_promotions
  FOR SELECT TO anon, authenticated
  USING (
    status = 'active'
    AND starts_at <= now()
    AND (ends_at IS NULL OR ends_at > now())
  );

-- company_cv_unlocks
ALTER TABLE public.company_cv_unlocks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cvu_admin"      ON public.company_cv_unlocks;
CREATE POLICY "cvu_admin" ON public.company_cv_unlocks
  FOR ALL TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "cvu_company"    ON public.company_cv_unlocks;
CREATE POLICY "cvu_company" ON public.company_cv_unlocks
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.companies
      WHERE id = company_cv_unlocks.company_id
        AND owner_id = auth.uid()
    )
  );

-- credit_transactions
ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ct_admin"       ON public.credit_transactions;
CREATE POLICY "ct_admin" ON public.credit_transactions
  FOR ALL TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "ct_company"     ON public.credit_transactions;
CREATE POLICY "ct_company" ON public.credit_transactions
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.companies
      WHERE id = credit_transactions.company_id
        AND owner_id = auth.uid()
    )
  );

-- banner_requests
ALTER TABLE public.banner_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "br_admin"       ON public.banner_requests;
CREATE POLICY "br_admin" ON public.banner_requests
  FOR ALL TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "br_company"     ON public.banner_requests;
CREATE POLICY "br_company" ON public.banner_requests
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.companies
      WHERE id = banner_requests.company_id
        AND owner_id = auth.uid()
    )
  );

-- worker_ratings
ALTER TABLE public.worker_ratings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "wr_admin"       ON public.worker_ratings;
CREATE POLICY "wr_admin" ON public.worker_ratings
  FOR ALL TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "wr_company"     ON public.worker_ratings;
CREATE POLICY "wr_company" ON public.worker_ratings
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.companies
      WHERE id = worker_ratings.company_id
        AND owner_id = auth.uid()
    )
  );

-- creative_templates
ALTER TABLE public.creative_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ct_admin_all"   ON public.creative_templates;
CREATE POLICY "ct_admin_all" ON public.creative_templates
  FOR ALL TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "ct_auth_read"   ON public.creative_templates;
CREATE POLICY "ct_auth_read" ON public.creative_templates
  FOR SELECT TO authenticated
  USING (active = true);

-- ── 16. PERFORMANCE INDEXES ───────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_companies_approved
  ON public.companies (approved, recommended DESC, recommended_priority DESC);

CREATE INDEX IF NOT EXISTS idx_jobs_active_created
  ON public.jobs (status, created_at DESC)
  WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_jobs_featured_active
  ON public.jobs (featured, status, created_at DESC)
  WHERE featured = true AND status = 'active';

-- ── KRAJ MIGRACIJE ────────────────────────────────────────────
SELECT 'supabase-growth-features-2026-05.sql: OK' AS migration_status;
