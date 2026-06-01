-- =============================================================
-- supabase-banners-notifications-fix.sql
-- Safe, idempotent migration. Run in Supabase SQL editor.
-- Created: 2026-05 for imaposla.me production
-- =============================================================

-- ──────────────────────────────────────────────────────────────
-- SECTION 1: NOTIFICATIONS TABLE
-- ──────────────────────────────────────────────────────────────

create table if not exists public.notifications (
  id          bigserial primary key,
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  title       text not null,
  message     text,
  notification_type text default 'system',
  link        text,
  read        boolean not null default false,
  created_at  timestamptz not null default now()
);

-- Indexes for fast per-user queries
create index if not exists idx_notifications_recipient
  on public.notifications(recipient_id);

create index if not exists idx_notifications_recipient_unread
  on public.notifications(recipient_id, read)
  where read = false;

create index if not exists idx_notifications_created
  on public.notifications(created_at desc);

-- Row Level Security
alter table public.notifications enable row level security;

drop policy if exists "notif_select_own" on public.notifications;
create policy "notif_select_own" on public.notifications
  for select using (recipient_id = auth.uid());

drop policy if exists "notif_update_own_read" on public.notifications;
create policy "notif_update_own_read" on public.notifications
  for update using (recipient_id = auth.uid())
  with check (recipient_id = auth.uid());

-- Admins can insert notifications for anyone (server-side only via service role)
-- No client-side insert policy needed; use service role key in server functions.


-- ──────────────────────────────────────────────────────────────
-- SECTION 2: BANNERS TABLE — add missing columns
-- ──────────────────────────────────────────────────────────────

-- Create banners table if it does not exist yet
create table if not exists public.banners (
  id              bigserial primary key,
  title           text not null,
  image_path      text,
  target_url      text,
  placement       text not null default 'homepage_top',
  format          text,
  target_audience text not null default 'all',
  device          text not null default 'all',
  approved        boolean not null default true,
  priority        integer not null default 0,
  start_date      timestamptz,
  end_date        timestamptz,
  impressions     integer not null default 0,
  clicks          integer not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- Add columns safely if table already exists but is missing some
alter table public.banners
  add column if not exists impressions integer not null default 0,
  add column if not exists clicks integer not null default 0,
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists target_audience text not null default 'all',
  add column if not exists device text not null default 'all',
  add column if not exists format text,
  add column if not exists priority integer not null default 0,
  add column if not exists start_date timestamptz,
  add column if not exists end_date timestamptz,
  add column if not exists approved boolean not null default true;

-- Index for fast active-banner queries (most common path)
create index if not exists idx_banners_placement_approved
  on public.banners(placement, approved);

create index if not exists idx_banners_priority
  on public.banners(placement, priority desc);

-- RLS for banners (public read of approved banners)
alter table public.banners enable row level security;

drop policy if exists "banners_public_read" on public.banners;
create policy "banners_public_read" on public.banners
  for select using (approved = true);

drop policy if exists "banners_admin_all" on public.banners;
create policy "banners_admin_all" on public.banners
  for all using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );


-- ──────────────────────────────────────────────────────────────
-- SECTION 3: increment_banner_click RPC
-- Safe to re-run — replaces existing function.
-- ──────────────────────────────────────────────────────────────

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

-- Allow anonymous/authed users to call it (click tracking is public)
grant execute on function public.increment_banner_click(bigint) to anon, authenticated;


-- ──────────────────────────────────────────────────────────────
-- SECTION 4: Mock / demo banner seed data
-- Only inserts if banners table is empty, so safe to run repeatedly.
-- ──────────────────────────────────────────────────────────────

do $$
begin
  if (select count(*) from public.banners) = 0 then
    insert into public.banners
      (title, image_path, target_url, placement, format, target_audience, device, approved, priority)
    values
      (
        'Demo — Početna vrh',
        'https://picsum.photos/seed/imaposla-home-top/970/250',
        'https://example.com/?utm_source=imaposla&utm_medium=banner&utm_campaign=demo_home_top',
        'homepage_top',
        'billboard_970x250',
        'all', 'all', true, 10
      ),
      (
        'Demo — Lista oglasa vrh',
        'https://picsum.photos/seed/imaposla-jobs-top/728/90',
        'https://example.com/?utm_source=imaposla&utm_medium=banner&utm_campaign=demo_jobs_top',
        'jobs_list_top',
        'leaderboard_728x90',
        'all', 'all', true, 10
      ),
      (
        'Demo — Detalj oglasa vrh',
        'https://picsum.photos/seed/imaposla-job-dtop/728/90',
        'https://example.com/?utm_source=imaposla&utm_medium=banner&utm_campaign=demo_job_detail',
        'job_detail_top',
        'leaderboard_728x90',
        'candidates', 'all', true, 10
      ),
      (
        'Demo — Stranica firme',
        'https://picsum.photos/seed/imaposla-co-top/970/90',
        'https://example.com/?utm_source=imaposla&utm_medium=banner&utm_campaign=demo_company',
        'company_pages_top',
        'large_leaderboard_970x90',
        'all', 'all', true, 10
      );
  end if;
end;
$$;


-- ──────────────────────────────────────────────────────────────
-- SECTION 5: Storage bucket for banners (if not exists)
-- Run separately in Supabase dashboard Storage section if needed.
-- SQL equivalent:
-- ──────────────────────────────────────────────────────────────
-- insert into storage.buckets (id, name, public)
-- values ('banners', 'banners', true)
-- on conflict (id) do nothing;


-- Done. Run: SELECT 'Migration OK' as status;
select 'supabase-banners-notifications-fix.sql: OK' as migration_status;


-- ──────────────────────────────────────────────────────────────
-- SECTION 6: DB TRIGGER — Notifikacija firmama na novu prijavu
-- Automatski kreira notifikaciju vlasniku firme kada kandidat aplicira.
-- Ovo je server-side rješenje jer klijent ne može insertovati
-- notifikacije za druge korisnike bez service role keya.
-- ──────────────────────────────────────────────────────────────

create or replace function public.notify_on_application()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_company_owner_id uuid;
  v_job_title text;
  v_candidate_name text;
begin
  -- Nađi vlasnika firme putem oglasa
  select c.owner_id, j.title
  into v_company_owner_id, v_job_title
  from jobs j
  join companies c on c.id = j.company_id
  where j.id = NEW.job_id;

  -- Ime kandidata
  select coalesce(full_name, email, 'Kandidat')
  into v_candidate_name
  from profiles where id = NEW.candidate_id;

  -- Notifikacija firmi
  if v_company_owner_id is not null then
    insert into public.notifications
      (recipient_id, title, message, notification_type, link)
    values
      (v_company_owner_id,
       'Nova prijava na oglas',
       v_candidate_name || ' je aplicirao/la na oglas: ' || coalesce(v_job_title, 'Nepoznat oglas'),
       'application_received',
       '/firma/selekcija');
  end if;

  return NEW;
end;
$$;

drop trigger if exists trg_notify_on_application on public.job_applications;
create trigger trg_notify_on_application
  after insert on public.job_applications
  for each row execute function public.notify_on_application();

-- Allow insert policy for notifications (for candidate self-notification from client)
drop policy if exists "notif_insert_own" on public.notifications;
create policy "notif_insert_own" on public.notifications
  for insert with check (recipient_id = auth.uid());

select 'Trigger trg_notify_on_application: OK' as trigger_status;
