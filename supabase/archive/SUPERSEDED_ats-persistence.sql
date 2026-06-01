-- ATS PERSISTENCE — komentari i oznake na prijavama
-- Pokreni u Supabase SQL Editoru jednom

-- ── COMMENTS TABLE ──────────────────────────────────────────
create table if not exists public.application_comments (
  id bigserial primary key,
  application_id bigint not null references public.job_applications(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  text text not null check (length(text) <= 1000),
  created_at timestamptz not null default now()
);

create index if not exists idx_app_comments_application on public.application_comments(application_id);

alter table public.application_comments enable row level security;

-- Vlasnik firme može čitati komentare za svoje prijave
drop policy if exists "company can read comments" on public.application_comments;
create policy "company can read comments" on public.application_comments
  for select using (
    exists (
      select 1 from public.job_applications ja
      join public.jobs j on j.id = ja.job_id
      join public.companies c on c.id = j.company_id
      where ja.id = application_comments.application_id
        and c.owner_id = auth.uid()
    )
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

-- Vlasnik firme može dodati komentar
drop policy if exists "company can insert comments" on public.application_comments;
create policy "company can insert comments" on public.application_comments
  for insert with check (
    author_id = auth.uid()
    and (
      exists (
        select 1 from public.job_applications ja
        join public.jobs j on j.id = ja.job_id
        join public.companies c on c.id = j.company_id
        where ja.id = application_comments.application_id
          and c.owner_id = auth.uid()
      )
      or exists (
        select 1 from public.profiles p
        where p.id = auth.uid() and p.role = 'admin'
      )
    )
  );

-- Autor može obrisati svoj komentar
drop policy if exists "author can delete own comment" on public.application_comments;
create policy "author can delete own comment" on public.application_comments
  for delete using (author_id = auth.uid());

-- ── LABELS TABLE ────────────────────────────────────────────
create table if not exists public.application_labels (
  id bigserial primary key,
  application_id bigint not null references public.job_applications(id) on delete cascade,
  label text not null check (label in ('top','interview','rejected','followup','star')),
  created_at timestamptz not null default now(),
  unique(application_id, label)
);

create index if not exists idx_app_labels_application on public.application_labels(application_id);

alter table public.application_labels enable row level security;

drop policy if exists "company can read labels" on public.application_labels;
create policy "company can read labels" on public.application_labels
  for select using (
    exists (
      select 1 from public.job_applications ja
      join public.jobs j on j.id = ja.job_id
      join public.companies c on c.id = j.company_id
      where ja.id = application_labels.application_id
        and c.owner_id = auth.uid()
    )
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

drop policy if exists "company can manage labels" on public.application_labels;
create policy "company can manage labels" on public.application_labels
  for all using (
    exists (
      select 1 from public.job_applications ja
      join public.jobs j on j.id = ja.job_id
      join public.companies c on c.id = j.company_id
      where ja.id = application_labels.application_id
        and c.owner_id = auth.uid()
    )
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

-- Gotovo. Sad CompanyClient može upisivati i čitati ovo iz baze.
