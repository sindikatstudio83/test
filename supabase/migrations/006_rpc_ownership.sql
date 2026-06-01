-- ═══════════════════════════════════════════════════════════════════════════
-- imaposla.me — SECURITY PATCH: RPC Ownership Checks
-- Fajl: supabase-security-patch-rpc-ownership.sql
-- Datum: 2026-05-19
-- Autor: Audit fix — P0 sigurnosni problemi
--
-- Ovaj fajl ispravlja dvije P0 sigurnosne ranjivosti u SECURITY DEFINER RPC
-- funkcijama koje nisu provjeravale da li pozivalac zapravo posjeduje firmu.
--
-- POKRETANJE:
--   Supabase Dashboard → SQL Editor → New query → Paste → Run
--   Idempotentno: može se pokrenuti više puta bez posljedica.
-- ═══════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────────────
-- FIX 1: spend_company_credits
-- PROBLEM: Nije provjeravalo da li auth.uid() posjeduje company p_company_id.
--          Svaki autentifikovani korisnik mogao je potrošiti kredite tuđe firme.
-- RJEŠENJE: Dodati provjeru da company.owner_id = auth.uid() ili da je admin.
-- ─────────────────────────────────────────────────────────────────────────────

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
  v_caller_role text;
BEGIN
  -- ── OWNERSHIP CHECK ──────────────────────────────────────────────────────
  -- Pozivalac mora biti: (a) vlasnik firme ILI (b) admin
  SELECT p.role INTO v_caller_role
  FROM public.profiles p
  WHERE p.id = auth.uid();

  IF v_caller_role != 'admin' THEN
    -- Provjeri da firma pripada pozivaocu
    IF NOT EXISTS (
      SELECT 1 FROM public.companies c
      WHERE c.id = p_company_id
        AND c.owner_id = auth.uid()
    ) THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'unauthorized'
      );
    END IF;
  END IF;
  -- ─────────────────────────────────────────────────────────────────────────

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


-- ─────────────────────────────────────────────────────────────────────────────
-- FIX 2: company_active_plan
-- PROBLEM: Svaki autentifikovani korisnik mogao je čitati plan BILO KOJE firme.
-- RJEŠENJE: Dozvoli samo vlasniku firme ili adminu. Ostali dobijaju prazan rezultat.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.company_active_plan(p_company_id bigint)
RETURNS TABLE (
  subscription_id   bigint,
  plan_id           bigint,
  plan_name         text,
  active_jobs_limit integer,
  active_until      date,
  is_active         boolean
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public AS $$
DECLARE
  v_caller_role text;
  v_is_owner    boolean;
BEGIN
  -- ── OWNERSHIP CHECK ──────────────────────────────────────────────────────
  SELECT p.role INTO v_caller_role
  FROM public.profiles p
  WHERE p.id = auth.uid();

  IF v_caller_role != 'admin' THEN
    SELECT EXISTS (
      SELECT 1 FROM public.companies c
      WHERE c.id = p_company_id
        AND c.owner_id = auth.uid()
    ) INTO v_is_owner;

    -- Ako nije vlasnik, vrati prazan rezultat (ne grešku)
    IF NOT v_is_owner THEN
      RETURN;
    END IF;
  END IF;
  -- ─────────────────────────────────────────────────────────────────────────

  RETURN QUERY
  SELECT
    s.id                    AS subscription_id,
    s.plan_id               AS plan_id,
    pl.name                 AS plan_name,
    pl.active_jobs          AS active_jobs_limit,
    s.active_until          AS active_until,
    (
      s.active_until IS NULL
      OR s.active_until >= CURRENT_DATE
    )                       AS is_active
  FROM public.subscriptions s
  JOIN public.plans pl ON pl.id = s.plan_id
  WHERE s.company_id = p_company_id
  ORDER BY s.id DESC
  LIMIT 1;
END;
$$;

-- Grant ostaje isti — autentifikovani korisnici mogu pozvati,
-- ali funkcija interno provjerava ownership
GRANT EXECUTE ON FUNCTION public.company_active_plan(bigint) TO authenticated;
GRANT EXECUTE ON FUNCTION public.spend_company_credits(bigint, integer, text, text, text, text) TO authenticated;
