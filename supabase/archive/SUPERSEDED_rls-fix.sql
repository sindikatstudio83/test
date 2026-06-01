-- ╔══════════════════════════════════════════════════════════════════╗
-- ║ FIX: Infinite recursion u RLS policy-jima na job_applications    ║
-- ╠══════════════════════════════════════════════════════════════════╣
-- ║ Pokreni JEDNOM u Supabase SQL Editoru                            ║
-- ║ Ovo briše SVE postojeće policy-je na job_applications i pravi    ║
-- ║ čiste, ne-rekurzivne policy-je.                                  ║
-- ╚══════════════════════════════════════════════════════════════════╝

-- ── 1. SECURITY DEFINER funkcija za provjeru "je li korisnik vlasnik firme" ──
-- Ovo razbija rekurziju jer funkcija ne podlježe RLS-u kad pristupa companies
create or replace function public.is_company_owner_of_application(app_id bigint)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from job_applications ja
    join jobs j on j.id = ja.job_id
    join companies c on c.id = j.company_id
    where ja.id = app_id
      and c.owner_id = auth.uid()
  );
$$;

-- Funkcija za provjeru je li korisnik admin (bez self-querya na profiles)
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin',
    false
  ) or exists (
    select 1 from profiles where id = auth.uid() and role = 'admin'
  );
$$;

-- ── 2. JOB_APPLICATIONS — drop all old policies ──
do $$
declare pol record;
begin
  for pol in select polname from pg_policy where polrelid = 'public.job_applications'::regclass loop
    execute format('drop policy if exists %I on public.job_applications', pol.polname);
  end loop;
end $$;

-- ── 3. JOB_APPLICATIONS — clean policies ──
alter table public.job_applications enable row level security;

-- Kandidat čita SVOJE prijave (direktna provjera, bez self-join)
create policy "candidate reads own applications" on public.job_applications
  for select
  using (candidate_id = auth.uid());

-- Firma čita prijave za SVOJE oglase (preko helper funkcije, bez rekurzije)
create policy "company reads own job applications" on public.job_applications
  for select
  using (
    exists (
      select 1 from public.jobs j
      join public.companies c on c.id = j.company_id
      where j.id = job_applications.job_id
        and c.owner_id = auth.uid()
    )
  );

-- Admin čita sve
create policy "admin reads all applications" on public.job_applications
  for select
  using (public.is_admin());

-- Kandidat može slati prijavu (insert) — samo na svoje ime
create policy "candidate inserts own application" on public.job_applications
  for insert
  with check (candidate_id = auth.uid());

-- Firma može mijenjati stage prijave za svoj oglas
create policy "company updates own job applications" on public.job_applications
  for update
  using (
    exists (
      select 1 from public.jobs j
      join public.companies c on c.id = j.company_id
      where j.id = job_applications.job_id
        and c.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.jobs j
      join public.companies c on c.id = j.company_id
      where j.id = job_applications.job_id
        and c.owner_id = auth.uid()
    )
  );

-- Admin može sve
create policy "admin updates all applications" on public.job_applications
  for update
  using (public.is_admin())
  with check (public.is_admin());

-- Kandidat može povući svoju prijavu
create policy "candidate deletes own application" on public.job_applications
  for delete
  using (candidate_id = auth.uid());

-- ── 4. PROFILES — fix da admin provjera ne pravi rekurziju ──
do $$
declare pol record;
begin
  for pol in select polname from pg_policy where polrelid = 'public.profiles'::regclass loop
    execute format('drop policy if exists %I on public.profiles', pol.polname);
  end loop;
end $$;

alter table public.profiles enable row level security;

-- Korisnik čita svoj profil
create policy "user reads own profile" on public.profiles
  for select using (id = auth.uid());

-- Firma može čitati profil kandidata koji je aplicirao na njen oglas
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

-- Admin čita sve (bez self-join na profiles)
create policy "admin reads all profiles" on public.profiles
  for select using (
    coalesce((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin', false)
  );

-- Korisnik update svoj profil
create policy "user updates own profile" on public.profiles
  for update
  using (id = auth.uid())
  with check (id = auth.uid() and role = (select role from public.profiles where id = auth.uid()));

-- Admin update sve
create policy "admin updates all profiles" on public.profiles
  for update
  using (coalesce((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin', false))
  with check (coalesce((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin', false));

-- Insert: trigger handle_new_user pravi profil pri signup-u
create policy "user inserts own profile" on public.profiles
  for insert with check (id = auth.uid());

-- ── GOTOVO ──
-- Provjeri:  select * from job_applications limit 1;  → ne smije biti recursion error
