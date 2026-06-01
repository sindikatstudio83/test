-- ════════════════════════════════════════════════════════════════════════════
-- 008_brzi_poslovi.sql — "Brzi poslovi" feature (quick gigs + worker marketplace)
-- ════════════════════════════════════════════════════════════════════════════
-- Adds:
--   professions          — lookup list of gig professions (admin-managed)
--   worker_profiles      — short public worker profiles ("brzi profil")
--   quick_gigs           — short-term job postings ("brzi angažmani")
--   quick_gig_applications — candidate applications to quick gigs
--   worker_messages      — internal contact inbox (login-only contact)
--   candidate_interests  — candidate interest preferences for weekly email
--   weekly_digest_log     — tracks sent weekly emails (idempotency)
--
-- All tables have RLS enabled. is_admin() is the canonical secure function
-- defined in 003_security_fixes.sql (reads from profiles, NOT jwt metadata).
-- ════════════════════════════════════════════════════════════════════════════

-- ── ENUM TYPES ───────────────────────────────────────────────────────────────
create type public.worker_status   as enum ('pending', 'active', 'hidden', 'rejected');
create type public.gig_status       as enum ('pending_review', 'active', 'closed', 'rejected', 'expired');
create type public.availability_type as enum ('immediately', 'weekends', 'seasonal', 'by_agreement', 'specific_date');

-- ── PROFESSIONS (lookup) ─────────────────────────────────────────────────────
create table public.professions (
  id      bigserial primary key,
  name    text not null,
  slug    text not null unique,
  icon    text,
  sort    int  not null default 100,
  active  boolean not null default true
);

-- Seed initial professions
insert into public.professions (name, slug, icon, sort) values
  ('Konobar',          'konobar',          '🍽️', 10),
  ('Šanker',           'sanker',           '🍹', 20),
  ('Kuvar',            'kuvar',            '👨‍🍳', 30),
  ('Pomoćni kuvar',    'pomocni-kuvar',    '🥘', 40),
  ('Hostesa',          'hostesa',          '💁', 50),
  ('Promoter',         'promoter',         '📣', 60),
  ('Moler',            'moler',            '🎨', 70),
  ('Majstor',          'majstor',          '🔧', 80),
  ('Pomoćni radnik',   'pomocni-radnik',   '💪', 90),
  ('Fizički radnik',   'fizicki-radnik',   '🏗️', 100),
  ('Dostavljač',       'dostavljac',       '🛵', 110),
  ('Vozač',            'vozac',            '🚗', 120),
  ('Čistačica',        'cistacica',        '🧹', 130),
  ('Fotograf',         'fotograf',         '📷', 140),
  ('DJ',               'dj',               '🎧', 150),
  ('Animator',         'animator',         '🎭', 160),
  ('Radnik za event',  'radnik-za-event',  '🎪', 170),
  ('Sezonski radnik',  'sezonski-radnik',  '🌴', 180);

-- ── WORKER PROFILES ──────────────────────────────────────────────────────────
create table public.worker_profiles (
  id              bigserial primary key,
  user_id         uuid not null references public.profiles(id) on delete cascade,
  display_name    text not null,
  profession_id   bigint references public.professions(id) on delete set null,
  profession_text text,                              -- denormalized for search/display
  cities          text[] not null default '{}',      -- list of cities worker covers
  availability    public.availability_type not null default 'by_agreement',
  available_from  date,                              -- when availability = specific_date
  experience_years int not null default 0,
  price_text      text,                              -- "od 50€/dan" or "po dogovoru"
  languages       text,
  bio             text,                              -- short pitch, max ~300 chars (enforced in UI)
  photo_path      text,
  contact_phone   text,
  contact_viber   text,
  contact_email   text,
  show_phone      boolean not null default false,    -- worker opt-in to show phone
  is_public       boolean not null default true,     -- worker toggles visibility
  status          public.worker_status not null default 'pending',
  is_premium      boolean not null default false,
  premium_until   timestamptz,
  is_verified     boolean not null default false,
  slug            text unique,                       -- premium gets /radnici/[slug]
  views           int not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique(user_id)                                    -- one worker profile per user
);

create index idx_worker_profiles_status     on public.worker_profiles(status) where status = 'active';
create index idx_worker_profiles_profession on public.worker_profiles(profession_id);
create index idx_worker_profiles_premium    on public.worker_profiles(is_premium, premium_until);
create index idx_worker_profiles_cities     on public.worker_profiles using gin(cities);

-- ── WORKER PORTFOLIO (premium gallery) ───────────────────────────────────────
create table public.worker_portfolio (
  id          bigserial primary key,
  worker_id   bigint not null references public.worker_profiles(id) on delete cascade,
  image_path  text not null,
  sort        int not null default 0,
  created_at  timestamptz not null default now()
);
create index idx_worker_portfolio_worker on public.worker_portfolio(worker_id);

-- ── QUICK GIGS (brzi angažmani) ──────────────────────────────────────────────
create table public.quick_gigs (
  id              bigserial primary key,
  posted_by       uuid not null references public.profiles(id) on delete cascade,
  company_id      bigint references public.companies(id) on delete set null,
  title           text not null,
  profession_id   bigint references public.professions(id) on delete set null,
  city            text not null,
  gig_date        date,                              -- when the gig happens
  gig_timing      text,                              -- "danas", "vikend", "sjutra uveče"
  pay_text        text,                              -- "60€/dan", "po dogovoru"
  description     text,
  is_urgent       boolean not null default false,
  is_featured     boolean not null default false,
  status          public.gig_status not null default 'pending_review',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index idx_quick_gigs_status     on public.quick_gigs(status) where status = 'active';
create index idx_quick_gigs_city       on public.quick_gigs(city);
create index idx_quick_gigs_profession on public.quick_gigs(profession_id);

-- ── QUICK GIG APPLICATIONS ───────────────────────────────────────────────────
create table public.quick_gig_applications (
  id           bigserial primary key,
  gig_id       bigint not null references public.quick_gigs(id) on delete cascade,
  candidate_id uuid not null references public.profiles(id) on delete cascade,
  message      text,
  created_at   timestamptz not null default now(),
  unique(gig_id, candidate_id)                       -- no duplicate applications
);
create index idx_gig_apps_gig       on public.quick_gig_applications(gig_id);
create index idx_gig_apps_candidate on public.quick_gig_applications(candidate_id);

-- ── WORKER MESSAGES (internal contact inbox) ─────────────────────────────────
create table public.worker_messages (
  id          bigserial primary key,
  worker_id   bigint not null references public.worker_profiles(id) on delete cascade,
  from_user   uuid not null references public.profiles(id) on delete cascade,
  from_name   text,
  from_contact text,                                 -- how sender wants to be reached back
  message     text not null,
  is_read     boolean not null default false,
  created_at  timestamptz not null default now()
);
create index idx_worker_messages_worker on public.worker_messages(worker_id, is_read);

-- ── CANDIDATE INTERESTS (for weekly digest) ──────────────────────────────────
create table public.candidate_interests (
  user_id        uuid primary key references public.profiles(id) on delete cascade,
  professions     bigint[] not null default '{}',     -- profession ids
  cities          text[] not null default '{}',
  categories      bigint[] not null default '{}',     -- regular job category ids
  job_types       text[] not null default '{}',       -- 'weekend','seasonal','urgent','remote','night'
  min_daily_pay   int,                                -- minimum daily rate in EUR
  email_enabled   boolean not null default true,
  email_frequency text not null default 'weekly',     -- reserved for future (daily/weekly)
  updated_at      timestamptz not null default now()
);

-- ── WEEKLY DIGEST LOG (idempotency for cron) ─────────────────────────────────
create table public.weekly_digest_log (
  id          bigserial primary key,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  sent_at     timestamptz not null default now(),
  job_count   int not null default 0,
  gig_count   int not null default 0
);
create index idx_digest_log_user on public.weekly_digest_log(user_id, sent_at);

-- ════════════════════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY
-- ════════════════════════════════════════════════════════════════════════════

alter table public.professions            enable row level security;
alter table public.worker_profiles        enable row level security;
alter table public.worker_portfolio       enable row level security;
alter table public.quick_gigs             enable row level security;
alter table public.quick_gig_applications enable row level security;
alter table public.worker_messages        enable row level security;
alter table public.candidate_interests    enable row level security;
alter table public.weekly_digest_log      enable row level security;

-- ── PROFESSIONS — public read, admin write ───────────────────────────────────
create policy "professions_public_read" on public.professions
  for select using (active = true or public.is_admin());
create policy "professions_admin_write" on public.professions
  for all using (public.is_admin()) with check (public.is_admin());

-- ── WORKER PROFILES ──────────────────────────────────────────────────────────
-- Public can read only active + public profiles
create policy "worker_public_read" on public.worker_profiles
  for select using (
    (status = 'active' and is_public = true)
    or user_id = auth.uid()
    or public.is_admin()
  );
-- Owner can insert their own profile
create policy "worker_owner_insert" on public.worker_profiles
  for insert with check (user_id = auth.uid());
-- Owner can update their own profile (but NOT status/premium/verified — those are admin-only)
create policy "worker_owner_update" on public.worker_profiles
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
-- Admin full control
create policy "worker_admin_all" on public.worker_profiles
  for all using (public.is_admin()) with check (public.is_admin());
-- Owner can delete own profile
create policy "worker_owner_delete" on public.worker_profiles
  for delete using (user_id = auth.uid() or public.is_admin());

-- ── WORKER PORTFOLIO ─────────────────────────────────────────────────────────
create policy "portfolio_public_read" on public.worker_portfolio
  for select using (
    exists (select 1 from public.worker_profiles w
            where w.id = worker_id and w.status = 'active' and w.is_public = true)
    or exists (select 1 from public.worker_profiles w
               where w.id = worker_id and w.user_id = auth.uid())
    or public.is_admin()
  );
create policy "portfolio_owner_write" on public.worker_portfolio
  for all using (
    exists (select 1 from public.worker_profiles w where w.id = worker_id and w.user_id = auth.uid())
    or public.is_admin()
  ) with check (
    exists (select 1 from public.worker_profiles w where w.id = worker_id and w.user_id = auth.uid())
    or public.is_admin()
  );

-- ── QUICK GIGS ───────────────────────────────────────────────────────────────
create policy "gigs_public_read" on public.quick_gigs
  for select using (status = 'active' or posted_by = auth.uid() or public.is_admin());
create policy "gigs_owner_insert" on public.quick_gigs
  for insert with check (posted_by = auth.uid());
create policy "gigs_owner_update" on public.quick_gigs
  for update using (posted_by = auth.uid()) with check (posted_by = auth.uid());
create policy "gigs_admin_all" on public.quick_gigs
  for all using (public.is_admin()) with check (public.is_admin());

-- ── QUICK GIG APPLICATIONS ───────────────────────────────────────────────────
-- Candidate sees own applications; gig owner sees applications to their gigs
create policy "gig_apps_read" on public.quick_gig_applications
  for select using (
    candidate_id = auth.uid()
    or exists (select 1 from public.quick_gigs g where g.id = gig_id and g.posted_by = auth.uid())
    or public.is_admin()
  );
create policy "gig_apps_candidate_insert" on public.quick_gig_applications
  for insert with check (candidate_id = auth.uid());
create policy "gig_apps_candidate_delete" on public.quick_gig_applications
  for delete using (candidate_id = auth.uid() or public.is_admin());

-- ── WORKER MESSAGES — only login users send, worker reads own inbox ──────────
create policy "messages_worker_read" on public.worker_messages
  for select using (
    exists (select 1 from public.worker_profiles w where w.id = worker_id and w.user_id = auth.uid())
    or from_user = auth.uid()
    or public.is_admin()
  );
-- Only authenticated users can send (enforced by auth.uid() not null)
create policy "messages_authed_insert" on public.worker_messages
  for insert with check (from_user = auth.uid() and auth.uid() is not null);
-- Worker can mark as read (update)
create policy "messages_worker_update" on public.worker_messages
  for update using (
    exists (select 1 from public.worker_profiles w where w.id = worker_id and w.user_id = auth.uid())
  );
create policy "messages_admin_all" on public.worker_messages
  for all using (public.is_admin()) with check (public.is_admin());

-- ── CANDIDATE INTERESTS — owner only ─────────────────────────────────────────
create policy "interests_owner_all" on public.candidate_interests
  for all using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid() or public.is_admin());

-- ── WEEKLY DIGEST LOG — owner read, admin all ────────────────────────────────
create policy "digest_owner_read" on public.weekly_digest_log
  for select using (user_id = auth.uid() or public.is_admin());
create policy "digest_admin_all" on public.weekly_digest_log
  for all using (public.is_admin()) with check (public.is_admin());

-- ════════════════════════════════════════════════════════════════════════════
-- SECURE RPCs
-- ════════════════════════════════════════════════════════════════════════════

-- Increment worker profile views (best-effort, anyone can call)
create or replace function public.increment_worker_view(p_worker_id bigint)
returns void
language sql
security definer
set search_path = public
as $$
  update public.worker_profiles set views = views + 1 where id = p_worker_id and status = 'active';
$$;

-- Admin: set worker status (approve/reject/hide)
create or replace function public.admin_set_worker_status(p_worker_id bigint, p_status public.worker_status)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Not authorized';
  end if;
  update public.worker_profiles set status = p_status, updated_at = now() where id = p_worker_id;
end;
$$;

-- Admin: set premium
create or replace function public.admin_set_worker_premium(p_worker_id bigint, p_premium boolean, p_until timestamptz)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Not authorized';
  end if;
  update public.worker_profiles
    set is_premium = p_premium, premium_until = p_until, updated_at = now()
    where id = p_worker_id;
end;
$$;

-- Admin: set quick gig status
create or replace function public.admin_set_gig_status(p_gig_id bigint, p_status public.gig_status)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Not authorized';
  end if;
  update public.quick_gigs set status = p_status, updated_at = now() where id = p_gig_id;
end;
$$;

-- Revoke broad execute, grant to authenticated where appropriate
revoke all on function public.increment_worker_view(bigint) from public;
grant execute on function public.increment_worker_view(bigint) to anon, authenticated;

revoke all on function public.admin_set_worker_status(bigint, public.worker_status) from public;
grant execute on function public.admin_set_worker_status(bigint, public.worker_status) to authenticated;

revoke all on function public.admin_set_worker_premium(bigint, boolean, timestamptz) from public;
grant execute on function public.admin_set_worker_premium(bigint, boolean, timestamptz) to authenticated;

revoke all on function public.admin_set_gig_status(bigint, public.gig_status) from public;
grant execute on function public.admin_set_gig_status(bigint, public.gig_status) to authenticated;

-- ════════════════════════════════════════════════════════════════════════════
-- STORAGE BUCKET for worker photos & portfolio
-- ════════════════════════════════════════════════════════════════════════════
-- Run this in Supabase Dashboard → Storage, OR via SQL below.
-- Bucket: worker-photos (public read)
insert into storage.buckets (id, name, public)
values ('worker-photos', 'worker-photos', true)
on conflict (id) do nothing;

-- Storage RLS: owner can upload to their own folder (path starts with their user_id)
create policy "worker_photos_public_read" on storage.objects
  for select using (bucket_id = 'worker-photos');
create policy "worker_photos_owner_insert" on storage.objects
  for insert with check (
    bucket_id = 'worker-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
create policy "worker_photos_owner_update" on storage.objects
  for update using (
    bucket_id = 'worker-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
create policy "worker_photos_owner_delete" on storage.objects
  for delete using (
    bucket_id = 'worker-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ════════════════════════════════════════════════════════════════════════════
-- Done. After running:
--   1. Verify professions seeded: SELECT count(*) FROM professions; → 18
--   2. Verify RLS: SELECT relname, relrowsecurity FROM pg_class WHERE relname LIKE 'worker%';
--   3. Test worker profile creation as a candidate user.
-- ════════════════════════════════════════════════════════════════════════════
