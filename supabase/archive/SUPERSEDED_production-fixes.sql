-- ══════════════════════════════════════════════════════════════
-- supabase-production-fixes.sql
-- Pokreni u Supabase SQL Editor (Dashboard → SQL Editor)
-- Sigurno za pokretanje na postojećim podacima — nema DROP TABLE
-- Redoslijed: nakon svih prethodnih migracija
-- ══════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────
-- 1. NOTIFICATIONS — dodati INSERT policy za autentifikovane
--    (admin iz dashboarda piše notifikacije koristeći anon key)
-- ─────────────────────────────────────────────────────────────

alter table public.notifications enable row level security;

-- Korisnik može primiti notifikaciju od bilo kojeg auth user-a
-- (trigger, admin client koji je auth'd, itd.)
drop policy if exists "notif_insert_authenticated" on public.notifications;
create policy "notif_insert_authenticated" on public.notifications
  for insert
  with check (
    auth.role() = 'authenticated'
  );

-- ─────────────────────────────────────────────────────────────
-- 2. COMPANIES — osigurati da owner_id kolona postoji
-- ─────────────────────────────────────────────────────────────
alter table public.companies
  add column if not exists owner_id uuid references auth.users(id) on delete set null;

create index if not exists idx_companies_owner on public.companies(owner_id);

-- ─────────────────────────────────────────────────────────────
-- 3. JOBS — osigurati featured kolonu
-- ─────────────────────────────────────────────────────────────
alter table public.jobs
  add column if not exists featured boolean not null default false;

create index if not exists idx_jobs_featured on public.jobs(featured) where featured = true;

-- ─────────────────────────────────────────────────────────────
-- 4. APPLICATION_LABELS — sigurna kreacija ako ne postoji
--    (ovo omogućava ATS enrichment bez pada)
-- ─────────────────────────────────────────────────────────────
create table if not exists public.application_labels (
  application_id bigint not null references public.job_applications(id) on delete cascade,
  label text not null check (label in ('top','interview','rejected','followup','star')),
  created_at timestamptz not null default now(),
  primary key (application_id, label)
);

alter table public.application_labels enable row level security;

drop policy if exists "company reads labels" on public.application_labels;
create policy "company reads labels" on public.application_labels
  for select using (
    exists (
      select 1 from public.job_applications ja
      join public.jobs j on j.id = ja.job_id
      join public.companies c on c.id = j.company_id
      where ja.id = application_labels.application_id
        and c.owner_id = auth.uid()
    )
  );

drop policy if exists "company manages labels" on public.application_labels;
create policy "company manages labels" on public.application_labels
  for all using (
    exists (
      select 1 from public.job_applications ja
      join public.jobs j on j.id = ja.job_id
      join public.companies c on c.id = j.company_id
      where ja.id = application_labels.application_id
        and c.owner_id = auth.uid()
    )
  );

-- ─────────────────────────────────────────────────────────────
-- 5. APPLICATION_COMMENTS — sigurna kreacija ako ne postoji
-- ─────────────────────────────────────────────────────────────
create table if not exists public.application_comments (
  id bigserial primary key,
  application_id bigint not null references public.job_applications(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  text text not null check (length(text) <= 1000),
  created_at timestamptz not null default now()
);

create index if not exists idx_app_comments_app on public.application_comments(application_id);

alter table public.application_comments enable row level security;

drop policy if exists "company manages comments" on public.application_comments;
create policy "company manages comments" on public.application_comments
  for all using (
    exists (
      select 1 from public.job_applications ja
      join public.jobs j on j.id = ja.job_id
      join public.companies c on c.id = j.company_id
      where ja.id = application_comments.application_id
        and c.owner_id = auth.uid()
    )
  );

-- ─────────────────────────────────────────────────────────────
-- 6. TRIGGER: kada admin odobri firmu (approved = true),
--    automatski upiši notifikaciju u notifications tabelu
-- ─────────────────────────────────────────────────────────────
create or replace function public.notify_company_approved()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Pokrenuti samo kada se approved mijenja iz false na true
  if (old.approved = false and new.approved = true and new.owner_id is not null) then
    insert into public.notifications (
      recipient_id, title, message, notification_type, link
    ) values (
      new.owner_id,
      'Firma odobrena ✓',
      format('Vaša firma "%s" je odobrena. Sada možete objavljivati oglase.', new.name),
      'company_approved',
      '/firma'
    )
    -- Ignoriši ako notifications tabela ne postoji (graceful degradation)
    on conflict do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_notify_company_approved on public.companies;
create trigger trg_notify_company_approved
  after update of approved on public.companies
  for each row execute function public.notify_company_approved();

-- ─────────────────────────────────────────────────────────────
-- 7. JOB_APPLICATIONS — RLS fix ako nije pokrenut rls-fix.sql
--    Siguran: drop if exists + create (idempotentno)
-- ─────────────────────────────────────────────────────────────

-- Provjera: da li firma može čitati prijave na svoje oglase
-- (Ako je rls-fix.sql već pokrenut, ovo je no-op)
drop policy if exists "company reads own job applications" on public.job_applications;
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

-- ─────────────────────────────────────────────────────────────
-- VERIFIKACIJA
-- ─────────────────────────────────────────────────────────────
select
  'notifications_insert_policy' as check_name,
  exists (
    select 1 from pg_policies
    where tablename = 'notifications'
    and policyname = 'notif_insert_authenticated'
  ) as exists;

select
  'company_approved_trigger' as check_name,
  exists (
    select 1 from information_schema.triggers
    where trigger_name = 'trg_notify_company_approved'
  ) as exists;

select
  'featured_column' as check_name,
  exists (
    select 1 from information_schema.columns
    where table_name = 'jobs' and column_name = 'featured'
  ) as exists;
