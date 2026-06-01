-- ╔══════════════════════════════════════════════════════════════════════╗
-- ║  imaposla.me — KOMPLETNA AUTH + RLS MIGRACIJA                        ║
-- ║                                                                       ║
-- ║  Pokreni JEDNOM u Supabase SQL Editoru.                              ║
-- ║  Idempotentno: može se pokretati više puta bez štete.                ║
-- ║                                                                       ║
-- ║  Ovo rješava:                                                         ║
-- ║   • Infinite recursion u RLS policy-jima                             ║
-- ║   • Profile row se ne kreira pri signup-u (handle_new_user trigger)  ║
-- ║   • Role escalation napadi (prevent_role_escalation trigger)         ║
-- ║   • Sve helper funkcije za clean RLS bez self-querya                 ║
-- ╚══════════════════════════════════════════════════════════════════════╝

-- ──────────────────────────────────────────────────────────────────────
-- 0. DROP STARIH FUNKCIJA (ako postoje sa drugim signature-om)
-- ──────────────────────────────────────────────────────────────────────

drop function if exists public.is_admin() cascade;
drop function if exists public.current_user_role() cascade;
drop function if exists public.is_company_owner(bigint) cascade;
drop function if exists public.is_company_owner_of_application(bigint) cascade;
drop function if exists public.handle_new_user() cascade;
drop function if exists public.prevent_role_escalation() cascade;
drop function if exists public.confirm_payment_proof(bigint) cascade;

-- ──────────────────────────────────────────────────────────────────────
-- 1. HELPER FUNKCIJE (SECURITY DEFINER — obilaze RLS, razbijaju petlju)
-- ──────────────────────────────────────────────────────────────────────

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  -- Prvo provjeri JWT metadata (najbrže, nema DB query)
  select coalesce(
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin',
    false
  );
$$;

create or replace function public.current_user_role()
returns text
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(
    (auth.jwt() -> 'user_metadata' ->> 'role'),
    (select role::text from profiles where id = auth.uid()),
    'guest'
  );
$$;

create or replace function public.is_company_owner(target_company_id bigint)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from companies
    where id = target_company_id and owner_id = auth.uid()
  );
$$;

-- ──────────────────────────────────────────────────────────────────────
-- 2. AUTOMATSKO KREIRANJE PROFILA (handle_new_user trigger)
-- ──────────────────────────────────────────────────────────────────────

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role public.user_role;
  v_meta_role text;
begin
  -- Default je candidate ako role nije specificirana
  v_meta_role := coalesce(new.raw_user_meta_data ->> 'role', 'candidate');

  -- Validacija — admin se NIKAD ne može dobiti kroz signup
  if v_meta_role = 'company' then
    v_role := 'company';
  else
    v_role := 'candidate';
  end if;

  insert into public.profiles (id, role, email, full_name, created_at, updated_at)
  values (
    new.id,
    v_role,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', null),
    now(),
    now()
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ──────────────────────────────────────────────────────────────────────
-- 3. ZAŠTITA OD ROLE ESCALATION
-- ──────────────────────────────────────────────────────────────────────

create or replace function public.prevent_role_escalation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Ako se role mijenja a korisnik nije admin, blokiraj
  if old.role is distinct from new.role then
    if not public.is_admin() then
      raise exception 'Role change is not permitted';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists prevent_role_escalation_trigger on public.profiles;
create trigger prevent_role_escalation_trigger
  before update on public.profiles
  for each row execute function public.prevent_role_escalation();

-- ──────────────────────────────────────────────────────────────────────
-- 4. PROFILES — clean RLS (bez rekurzije)
-- ──────────────────────────────────────────────────────────────────────

do $$
declare pol record;
begin
  for pol in select polname from pg_policy where polrelid = 'public.profiles'::regclass loop
    execute format('drop policy if exists %I on public.profiles', pol.polname);
  end loop;
end $$;

alter table public.profiles enable row level security;

create policy "user reads own profile" on public.profiles
  for select using (id = auth.uid());

create policy "admin reads all profiles" on public.profiles
  for select using (public.is_admin());

create policy "company reads applicant profile" on public.profiles
  for select using (
    exists (
      select 1 from public.job_applications ja
      join public.jobs j on j.id = ja.job_id
      join public.companies c on c.id = j.company_id
      where ja.candidate_id = profiles.id
        and c.owner_id = auth.uid()
    )
  );

create policy "user inserts own profile" on public.profiles
  for insert with check (id = auth.uid());

create policy "user updates own profile" on public.profiles
  for update using (id = auth.uid())
  with check (id = auth.uid());

create policy "admin updates all profiles" on public.profiles
  for update using (public.is_admin())
  with check (public.is_admin());

-- ──────────────────────────────────────────────────────────────────────
-- 5. JOB_APPLICATIONS — clean RLS (bez rekurzije)
-- ──────────────────────────────────────────────────────────────────────

do $$
declare pol record;
begin
  for pol in select polname from pg_policy where polrelid = 'public.job_applications'::regclass loop
    execute format('drop policy if exists %I on public.job_applications', pol.polname);
  end loop;
end $$;

alter table public.job_applications enable row level security;

create policy "candidate reads own applications" on public.job_applications
  for select using (candidate_id = auth.uid());

create policy "company reads applications for own jobs" on public.job_applications
  for select using (
    exists (
      select 1 from public.jobs j
      join public.companies c on c.id = j.company_id
      where j.id = job_applications.job_id and c.owner_id = auth.uid()
    )
  );

create policy "admin reads all applications" on public.job_applications
  for select using (public.is_admin());

create policy "candidate inserts own application" on public.job_applications
  for insert with check (candidate_id = auth.uid());

create policy "company updates applications for own jobs" on public.job_applications
  for update using (
    exists (
      select 1 from public.jobs j
      join public.companies c on c.id = j.company_id
      where j.id = job_applications.job_id and c.owner_id = auth.uid()
    )
  );

create policy "admin updates all applications" on public.job_applications
  for update using (public.is_admin()) with check (public.is_admin());

create policy "candidate deletes own application" on public.job_applications
  for delete using (candidate_id = auth.uid());

-- ──────────────────────────────────────────────────────────────────────
-- 6. COMPANIES — clean RLS
-- ──────────────────────────────────────────────────────────────────────

do $$
declare pol record;
begin
  for pol in select polname from pg_policy where polrelid = 'public.companies'::regclass loop
    execute format('drop policy if exists %I on public.companies', pol.polname);
  end loop;
end $$;

alter table public.companies enable row level security;

create policy "everyone reads approved companies" on public.companies
  for select using (approved = true);

create policy "owner reads own company" on public.companies
  for select using (owner_id = auth.uid());

create policy "admin reads all companies" on public.companies
  for select using (public.is_admin());

create policy "owner inserts own company" on public.companies
  for insert with check (owner_id = auth.uid());

create policy "owner updates own company" on public.companies
  for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy "admin updates all companies" on public.companies
  for update using (public.is_admin()) with check (public.is_admin());

-- ──────────────────────────────────────────────────────────────────────
-- 7. JOBS — clean RLS
-- ──────────────────────────────────────────────────────────────────────

do $$
declare pol record;
begin
  for pol in select polname from pg_policy where polrelid = 'public.jobs'::regclass loop
    execute format('drop policy if exists %I on public.jobs', pol.polname);
  end loop;
end $$;

alter table public.jobs enable row level security;

create policy "everyone reads active jobs" on public.jobs
  for select using (status = 'active');

create policy "owner reads own jobs" on public.jobs
  for select using (
    exists (select 1 from companies where id = jobs.company_id and owner_id = auth.uid())
  );

create policy "admin reads all jobs" on public.jobs
  for select using (public.is_admin());

create policy "company inserts jobs for own company" on public.jobs
  for insert with check (
    exists (select 1 from companies where id = jobs.company_id and owner_id = auth.uid())
  );

create policy "company updates own jobs" on public.jobs
  for update using (
    exists (select 1 from companies where id = jobs.company_id and owner_id = auth.uid())
  );

create policy "admin updates all jobs" on public.jobs
  for update using (public.is_admin()) with check (public.is_admin());

-- ──────────────────────────────────────────────────────────────────────
-- 8. CITIES & CATEGORIES — javno čitljivo
-- ──────────────────────────────────────────────────────────────────────

alter table public.cities enable row level security;
alter table public.categories enable row level security;

drop policy if exists "everyone reads cities" on public.cities;
create policy "everyone reads cities" on public.cities for select using (true);

drop policy if exists "everyone reads categories" on public.categories;
create policy "everyone reads categories" on public.categories for select using (true);

drop policy if exists "admin manages cities" on public.cities;
create policy "admin manages cities" on public.cities for all
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "admin manages categories" on public.categories;
create policy "admin manages categories" on public.categories for all
  using (public.is_admin()) with check (public.is_admin());

-- ──────────────────────────────────────────────────────────────────────
-- 9. PLANS — javno čitljivo (cjenovnik)
-- ──────────────────────────────────────────────────────────────────────

alter table public.plans enable row level security;

drop policy if exists "everyone reads plans" on public.plans;
create policy "everyone reads plans" on public.plans for select using (true);

drop policy if exists "admin manages plans" on public.plans;
create policy "admin manages plans" on public.plans for all
  using (public.is_admin()) with check (public.is_admin());

-- ──────────────────────────────────────────────────────────────────────
-- 10. ORDERS & PAYMENT_PROOFS — billing flow
-- ──────────────────────────────────────────────────────────────────────

alter table public.orders enable row level security;

do $$
declare pol record;
begin
  for pol in select polname from pg_policy where polrelid = 'public.orders'::regclass loop
    execute format('drop policy if exists %I on public.orders', pol.polname);
  end loop;
end $$;

create policy "owner reads own orders" on public.orders
  for select using (
    exists (select 1 from companies where id = orders.company_id and owner_id = auth.uid())
  );
create policy "admin reads all orders" on public.orders for select using (public.is_admin());
create policy "owner creates own order" on public.orders
  for insert with check (
    exists (select 1 from companies where id = orders.company_id and owner_id = auth.uid())
  );
create policy "admin updates orders" on public.orders for update
  using (public.is_admin()) with check (public.is_admin());

alter table public.payment_proofs enable row level security;

do $$
declare pol record;
begin
  for pol in select polname from pg_policy where polrelid = 'public.payment_proofs'::regclass loop
    execute format('drop policy if exists %I on public.payment_proofs', pol.polname);
  end loop;
end $$;

create policy "owner reads own proofs" on public.payment_proofs
  for select using (
    exists (
      select 1 from orders o
      join companies c on c.id = o.company_id
      where o.id = payment_proofs.order_id and c.owner_id = auth.uid()
    )
  );
create policy "admin reads all proofs" on public.payment_proofs for select using (public.is_admin());
create policy "owner uploads own proof" on public.payment_proofs
  for insert with check (
    exists (
      select 1 from orders o
      join companies c on c.id = o.company_id
      where o.id = payment_proofs.order_id and c.owner_id = auth.uid()
    )
  );
create policy "admin updates proofs" on public.payment_proofs for update
  using (public.is_admin()) with check (public.is_admin());

-- ──────────────────────────────────────────────────────────────────────
-- 11. confirm_payment_proof RPC (admin koristi)
-- ──────────────────────────────────────────────────────────────────────

create or replace function public.confirm_payment_proof(p_proof_id bigint)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order_id bigint;
begin
  if not public.is_admin() then
    raise exception 'Only admin can confirm payment proofs';
  end if;

  update payment_proofs set status = 'approved', reviewed_at = now() where id = p_proof_id
  returning order_id into v_order_id;

  if v_order_id is not null then
    update orders set status = 'paid', paid_at = now() where id = v_order_id;
  end if;
end;
$$;

grant execute on function public.confirm_payment_proof(bigint) to authenticated;

-- ──────────────────────────────────────────────────────────────────────
-- ✓ GOTOVO
--
-- Provjera da je sve OK:
--   select id, role from profiles limit 1;             -- ne smije recursion
--   select id from job_applications limit 1;           -- ne smije recursion
--   select * from companies where approved = true;     -- public OK
--   select public.is_admin();                          -- false ako nisi admin
-- ──────────────────────────────────────────────────────────────────────
