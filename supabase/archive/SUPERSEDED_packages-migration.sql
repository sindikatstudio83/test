-- ═══════════════════════════════════════════════════════════════════
-- supabase-packages-migration.sql
-- Safe, idempotent migration for subscription packages management
-- Run in Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════════

-- ── SECTION 1: Add management columns to existing plans table ────────
alter table public.plans
  add column if not exists slug text,
  add column if not exists description text,
  add column if not exists is_active boolean not null default true,
  add column if not exists display_order integer not null default 0,
  add column if not exists is_recommended boolean not null default false,
  add column if not exists updated_at timestamptz not null default now();

-- Generate slugs for existing rows that don't have one
update public.plans
set slug = lower(regexp_replace(
  regexp_replace(name, '[čćĆČ]', 'c', 'g'),
  '[^a-z0-9]+', '-', 'g'
))
where slug is null or slug = '';

-- Make slug not null and unique after populating
alter table public.plans alter column slug set not null;

-- Add unique constraint if not already there (safe)
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'plans_slug_key' and conrelid = 'public.plans'::regclass
  ) then
    alter table public.plans add constraint plans_slug_key unique (slug);
  end if;
end;
$$;

-- Index for display_order sorting
create index if not exists idx_plans_display_order on public.plans(display_order);
create index if not exists idx_plans_is_active on public.plans(is_active);

-- ── SECTION 2: RLS policies ──────────────────────────────────────────
alter table public.plans enable row level security;

-- Public can read active plans
drop policy if exists "public_read_active_plans" on public.plans;
create policy "public_read_active_plans" on public.plans
  for select
  using (is_active = true);

-- Admins can do everything
drop policy if exists "admin_manage_plans" on public.plans;
create policy "admin_manage_plans" on public.plans
  for all
  using (public.is_admin())
  with check (public.is_admin());

-- ── SECTION 3: Trigger to keep updated_at fresh ──────────────────────
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_plans_updated_at on public.plans;
create trigger set_plans_updated_at
  before update on public.plans
  for each row execute function public.set_updated_at();

-- ── SECTION 4: Seed sample plans if table is empty ───────────────────
do $$
begin
  if (select count(*) from public.plans) = 0 then
    insert into public.plans
      (name, slug, description, price_eur, active_jobs, unlock_credits, features, is_active, display_order, is_recommended)
    values
      (
        'Starter',
        'starter',
        'Idealno za manje firme koje žele testirati platformu.',
        0,
        1,
        0,
        array['1 aktivan oglas', 'Javni profil firme', 'Prijave kandidata'],
        true, 0, false
      ),
      (
        'Basic',
        'basic',
        'Za firme koje redovno objavljuju oglase.',
        49,
        5,
        10,
        array['5 aktivnih oglasa', 'Javni profil firme', 'ATS selekcija', '10 unlock kredita', 'Email podrška'],
        true, 1, false
      ),
      (
        'Pro',
        'pro',
        'Najpopularniji izbor za rastuće firme.',
        99,
        15,
        30,
        array['15 aktivnih oglasa', 'Javni profil firme', 'ATS selekcija', '30 unlock kredita', 'Prioritetna podrška', 'Istaknuti oglasi'],
        true, 2, true
      ),
      (
        'Enterprise',
        'enterprise',
        'Za firme sa intenzivnim procesom zapošljavanja.',
        199,
        50,
        100,
        array['50 aktivnih oglasa', 'Javni profil firme', 'ATS selekcija', '100 unlock kredita', 'Dedikovan account manager', 'Banner oglašavanje'],
        true, 3, false
      );
  end if;
end;
$$;

-- ── SECTION 5: Subscriptions table improvements ───────────────────────
alter table public.subscriptions
  add column if not exists status text not null default 'active',
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

create index if not exists idx_subscriptions_company on public.subscriptions(company_id);
create index if not exists idx_subscriptions_status on public.subscriptions(status);

-- ── DONE ─────────────────────────────────────────────────────────────
select 'supabase-packages-migration.sql: OK' as migration_status;
