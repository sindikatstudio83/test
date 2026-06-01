-- ══════════════════════════════════════════════════════════════════════
-- supabase-missing-tables.sql
-- imaposla.me — tabele koje nedostaju u svim prethodnim migracijama.
-- Pokrenuti u Supabase SQL Editoru. Idempotentno — može se pokretati
-- više puta bez štete na podacima.
-- ══════════════════════════════════════════════════════════════════════


-- ─────────────────────────────────────────────────────────────────────
-- 1. SAVED JOBS
-- Kandidat čuva oglase. user_id = profiles.id (NE companies.id).
-- ─────────────────────────────────────────────────────────────────────

create table if not exists public.saved_jobs (
  id          bigserial primary key,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  job_id      bigint not null references public.jobs(id) on delete cascade,
  created_at  timestamptz not null default now(),
  unique(user_id, job_id)
);

create index if not exists idx_saved_jobs_user   on public.saved_jobs(user_id);
create index if not exists idx_saved_jobs_job    on public.saved_jobs(job_id);
create index if not exists idx_saved_jobs_created on public.saved_jobs(created_at desc);

alter table public.saved_jobs enable row level security;

drop policy if exists "saved_jobs_own_select" on public.saved_jobs;
create policy "saved_jobs_own_select" on public.saved_jobs
  for select using (user_id = auth.uid());

drop policy if exists "saved_jobs_own_insert" on public.saved_jobs;
create policy "saved_jobs_own_insert" on public.saved_jobs
  for insert with check (user_id = auth.uid());

drop policy if exists "saved_jobs_own_delete" on public.saved_jobs;
create policy "saved_jobs_own_delete" on public.saved_jobs
  for delete using (user_id = auth.uid());


-- ─────────────────────────────────────────────────────────────────────
-- 2. JOB ALERTS
-- Kandidat postavlja filter-alerte za buduće oglase.
-- ─────────────────────────────────────────────────────────────────────

create table if not exists public.job_alerts (
  id              bigserial primary key,
  candidate_id    uuid not null references public.profiles(id) on delete cascade,
  city_id         bigint references public.cities(id) on delete set null,
  category_id     bigint references public.categories(id) on delete set null,
  contract_type   text,
  keywords        text,
  active          boolean not null default true,
  created_at      timestamptz not null default now()
);

create index if not exists idx_job_alerts_candidate on public.job_alerts(candidate_id);
create index if not exists idx_job_alerts_active    on public.job_alerts(candidate_id, active);

alter table public.job_alerts enable row level security;

drop policy if exists "job_alerts_own_select" on public.job_alerts;
create policy "job_alerts_own_select" on public.job_alerts
  for select using (candidate_id = auth.uid());

drop policy if exists "job_alerts_own_insert" on public.job_alerts;
create policy "job_alerts_own_insert" on public.job_alerts
  for insert with check (candidate_id = auth.uid());

drop policy if exists "job_alerts_own_update" on public.job_alerts;
create policy "job_alerts_own_update" on public.job_alerts
  for update using (candidate_id = auth.uid())
  with check (candidate_id = auth.uid());

drop policy if exists "job_alerts_own_delete" on public.job_alerts;
create policy "job_alerts_own_delete" on public.job_alerts
  for delete using (candidate_id = auth.uid());


-- ─────────────────────────────────────────────────────────────────────
-- 3. JOB VIEWS
-- Best-effort praćenje pregleda oglasa (bez stroge RLS — insert-only).
-- viewer_id je null za neautentifikovane korisnike.
-- ─────────────────────────────────────────────────────────────────────

create table if not exists public.job_views (
  id          bigserial primary key,
  job_id      bigint not null references public.jobs(id) on delete cascade,
  viewer_id   uuid references public.profiles(id) on delete set null,
  session_id  text,
  created_at  timestamptz not null default now()
);

create index if not exists idx_job_views_job     on public.job_views(job_id);
create index if not exists idx_job_views_created on public.job_views(created_at desc);

-- Deduplikacija: sprječava duplikate za isti session u zadnjim 24h
create index if not exists idx_job_views_session
  on public.job_views(job_id, session_id, created_at desc);

alter table public.job_views enable row level security;

-- Svi mogu insertovati (anon i authenticated) — best-effort tracking
drop policy if exists "job_views_public_insert" on public.job_views;
create policy "job_views_public_insert" on public.job_views
  for insert with check (true);

-- Niko ne može čitati tuđe view-ove direktno (admin može koristiti service role)
drop policy if exists "job_views_owner_select" on public.job_views;
create policy "job_views_owner_select" on public.job_views
  for select using (
    viewer_id = auth.uid()
    or exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );


-- ─────────────────────────────────────────────────────────────────────
-- 4. company_active_plan RPC
-- Vraća aktivan plan firme (ako postoji) — koristi se u billing prikazu.
-- Poziv: supabase.rpc('company_active_plan', { p_company_id: 123 })
-- ─────────────────────────────────────────────────────────────────────

create or replace function public.company_active_plan(p_company_id bigint)
returns table (
  subscription_id  bigint,
  plan_id          bigint,
  plan_name        text,
  active_jobs_limit integer,
  active_until     date,
  is_active        boolean
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  return query
  select
    s.id                    as subscription_id,
    s.plan_id               as plan_id,
    pl.name                 as plan_name,
    pl.active_jobs          as active_jobs_limit,
    s.active_until          as active_until,
    (
      s.active_until is null         -- Bez roka = zauvijek aktivan
      or s.active_until >= current_date
    )                               as is_active
  from public.subscriptions s
  join public.plans pl on pl.id = s.plan_id
  where s.company_id = p_company_id
  order by s.id desc
  limit 1;
end;
$$;

-- Dozvoli poziv autentifikovanim korisnicima (firma čita vlastiti plan)
grant execute on function public.company_active_plan(bigint) to authenticated;


-- ─────────────────────────────────────────────────────────────────────
-- 5. increment_banner_click RPC (ako ne postoji)
-- ─────────────────────────────────────────────────────────────────────

create or replace function public.increment_banner_click(p_banner_id bigint)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.banners
  set clicks = clicks + 1, updated_at = now()
  where id = p_banner_id;
end;
$$;

grant execute on function public.increment_banner_click(bigint) to anon, authenticated;


-- ─────────────────────────────────────────────────────────────────────
-- DONE
-- ─────────────────────────────────────────────────────────────────────
select
  'saved_jobs'   as table_name, count(*) as rows from public.saved_jobs
union all select 'job_alerts',  count(*) from public.job_alerts
union all select 'job_views',   count(*) from public.job_views;
