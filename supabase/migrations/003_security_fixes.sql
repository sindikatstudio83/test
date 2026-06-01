-- ══════════════════════════════════════════════════════════════════════
-- supabase-security-fixes.sql
-- Sigurnosne i funkcionalne popravke na osnovu audit reporta
-- Pokreni u: Supabase Dashboard → SQL Editor
-- Redosljed: nakon svih prethodnih migracija
-- Sigurno za postojeće podatke
-- ══════════════════════════════════════════════════════════════════════


-- ─────────────────────────────────────────────────────────────────────
-- 1. is_admin() — ne koristiti user_metadata, samo profiles.role
-- ─────────────────────────────────────────────────────────────────────
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
      and role in ('admin', 'superadmin')
  );
$$;

-- Isti fix za private shemu ako postoji
create or replace function private.is_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
      and role in ('admin', 'superadmin')
  );
$$;


-- ─────────────────────────────────────────────────────────────────────
-- 2. NOTIFICATIONS — stezanje insert policy
--    Samo: korisnik sebi, ili admin, ili service_role
-- ─────────────────────────────────────────────────────────────────────
drop policy if exists "notif_insert_own"            on public.notifications;
drop policy if exists "notif_insert_authenticated"  on public.notifications;

create policy "notif_insert_controlled" on public.notifications
  for insert
  with check (
    -- Korisnik šalje sebi
    recipient_id = auth.uid()
    -- Ili je admin
    or public.is_admin()
  );


-- ─────────────────────────────────────────────────────────────────────
-- 3. PAYMENT-PROOFS storage policy
--    Path u kodu: {company.id}/{order.id}-{ts}-{name}
--    Policy mora dozvoliti upload ako user owns company
--    Alternativa: jednostavnija policy koja provjerava auth.uid()
--    ali koristi company.owner_id join
-- ─────────────────────────────────────────────────────────────────────

-- Storage policy se ne može kreirati kroz SQL — mora kroz Supabase Dashboard
-- ili kroz storage API. Umjesto toga, mijenjamo path u kodu (vidjeti frontend fix)
-- i dodajemo DB-side provjeru koji kompanija pripada korisniku.

-- Provjera: company_owner helper
create or replace function public.user_owns_company(p_company_id bigint)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.companies
    where id = p_company_id
      and owner_id = auth.uid()
  );
$$;


-- ─────────────────────────────────────────────────────────────────────
-- 4. confirm_payment_proof RPC — fix arg i kolona
--    Bug: frontend šalje proof_id, RPC očekuje p_proof_id
--    Bug: RPC piše paid_at koji ne postoji, treba confirmed_at
-- ─────────────────────────────────────────────────────────────────────
create or replace function public.confirm_payment_proof(p_proof_id bigint)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_proof   public.payment_proofs%rowtype;
  v_order   public.orders%rowtype;
  v_plan    public.plans%rowtype;
  v_sub_id  bigint;
begin
  -- Samo admin smije potvrditi
  if not public.is_admin() then
    raise exception 'Nemate dozvolu za ovu akciju.';
  end if;

  -- Dohvati proof
  select * into v_proof from public.payment_proofs where id = p_proof_id;
  if not found then
    raise exception 'Dokaz uplate nije pronađen.';
  end if;

  -- Dohvati order
  select * into v_order from public.orders where id = v_proof.order_id;
  if not found then
    raise exception 'Narudžba nije pronađena.';
  end if;

  -- Dohvati plan
  select * into v_plan from public.plans where id = v_order.plan_id;

  -- Ažuriraj proof
  update public.payment_proofs
  set status = 'approved', updated_at = now()
  where id = p_proof_id;

  -- Ažuriraj order — koristi confirmed_at (ne paid_at)
  update public.orders
  set
    status = 'paid',
    confirmed_at = now()
  where id = v_order.id;

  -- Kreiraj ili obnovi subscriptions
  insert into public.subscriptions (company_id, plan_id, order_id, active_until)
  values (
    v_order.company_id,
    v_order.plan_id,
    v_order.id,
    current_date + (
      case
        when v_plan.name ilike '%enterprise%' then interval '365 days'
        when v_plan.name ilike '%business%'   then interval '180 days'
        else interval '30 days'
      end
    )
  )
  on conflict (company_id) do update
    set
      plan_id     = excluded.plan_id,
      order_id    = excluded.order_id,
      active_until = excluded.active_until,
      updated_at  = now();

  -- Notifikacija firmi
  insert into public.notifications (recipient_id, title, message, notification_type, link)
  select
    c.owner_id,
    'Uplata potvrđena ✓',
    format('Vaš paket "%s" je aktiviran.', v_plan.name),
    'payment_confirmed',
    '/firma/pretplata'
  from public.companies c
  where c.id = v_order.company_id
  on conflict do nothing;

  return jsonb_build_object('success', true, 'subscription_created', true);
end;
$$;

grant execute on function public.confirm_payment_proof(bigint) to authenticated;


-- ─────────────────────────────────────────────────────────────────────
-- 5. JOB_APPLICATIONS insert — provjeravaj da je oglas aktivan
-- ─────────────────────────────────────────────────────────────────────
drop policy if exists "candidates_can_apply"           on public.job_applications;
drop policy if exists "candidate_insert_application"   on public.job_applications;
drop policy if exists "job_applications_insert_own"    on public.job_applications;

create policy "candidates_apply_active_jobs" on public.job_applications
  for insert
  with check (
    candidate_id = auth.uid()
    and exists (
      select 1 from public.jobs
      where jobs.id = job_applications.job_id
        and jobs.status = 'active'
    )
  );


-- ─────────────────────────────────────────────────────────────────────
-- 6. PLANS — prikazivati samo aktivne planove javno
-- ─────────────────────────────────────────────────────────────────────
drop policy if exists "public_read_plans"  on public.plans;
drop policy if exists "plans_public_read"  on public.plans;

create policy "plans_active_public_read" on public.plans
  for select
  using (
    is_active = true
    or public.is_admin()
  );


-- ─────────────────────────────────────────────────────────────────────
-- 7. ORDERS — osiguraj da confirmed_at kolona postoji
-- ─────────────────────────────────────────────────────────────────────
alter table public.orders
  add column if not exists confirmed_at timestamptz;


-- ─────────────────────────────────────────────────────────────────────
-- 8. SUBSCRIPTIONS — unique constraint na company_id
--    (jedan aktivan plan po firmi)
-- ─────────────────────────────────────────────────────────────────────
alter table public.subscriptions
  add column if not exists updated_at timestamptz not null default now();

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'subscriptions_company_id_key'
  ) then
    alter table public.subscriptions
      add constraint subscriptions_company_id_key unique (company_id);
  end if;
end $$;


-- ─────────────────────────────────────────────────────────────────────
-- 9. JOB_APPLICATIONS unique constraint (sprečava duplikate)
-- ─────────────────────────────────────────────────────────────────────
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'job_applications_unique_candidate_job'
  ) then
    alter table public.job_applications
      add constraint job_applications_unique_candidate_job
        unique (candidate_id, job_id);
  end if;
end $$;


-- ─────────────────────────────────────────────────────────────────────
-- 10. INDEKSI za performanse
-- ─────────────────────────────────────────────────────────────────────

-- Full-text search na oglasima (srpski simple config)
create index if not exists jobs_search_idx
  on public.jobs
  using gin (
    to_tsvector('simple',
      coalesce(title, '') || ' ' ||
      coalesce(description, '') || ' ' ||
      coalesce(contract_type, '') || ' ' ||
      coalesce(salary_text, '')
    )
  );

-- Brzi public listing (status + sort)
create index if not exists idx_jobs_active_featured_created
  on public.jobs (status, featured desc, created_at desc)
  where status = 'active';

-- Filter po gradu i kategoriji
create index if not exists idx_jobs_active_city
  on public.jobs (city_id, status, created_at desc)
  where status = 'active';

create index if not exists idx_jobs_active_category
  on public.jobs (category_id, status, created_at desc)
  where status = 'active';

-- Baneri po placement i datumu
create index if not exists idx_banners_placement_active
  on public.banners (placement, approved, priority desc)
  where approved = true;

-- Prijave po job_id i kandidatu (ATS brzo)
create index if not exists idx_job_applications_job_created
  on public.job_applications (job_id, created_at desc);

create index if not exists idx_job_applications_candidate
  on public.job_applications (candidate_id, created_at desc);

-- Notifikacije po primaocu
create index if not exists idx_notifications_recipient_unread
  on public.notifications (recipient_id, created_at desc)
  where is_read = false;

-- Kompanije po owneru
create index if not exists idx_companies_owner
  on public.companies (owner_id);


-- ─────────────────────────────────────────────────────────────────────
-- 11. PROVJERA — loguj stanje
-- ─────────────────────────────────────────────────────────────────────
select
  'is_admin() fixed'          as check_name,
  'profiles.role only'        as implementation
union all select
  'notifications policy',     'recipient=self or admin'
union all select
  'confirm_payment_proof RPC', 'p_proof_id + confirmed_at + subscription'
union all select
  'job_applications active',  'only active jobs'
union all select
  'plans active only',        'is_active=true or admin'
union all select
  'indexes created',          'search,city,category,banners,apps,notifications';
