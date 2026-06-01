-- ============================================================
-- supabase-audit-and-setup.sql
-- Pokrenuti ZADNJI — nakon svih ostalih migracija
-- Idempotentno — sigurno za ponovljeno pokretanje
-- ============================================================

-- ── 1. ADMIN AUDIT LOG ───────────────────────────────────────
-- Prati sve kritične admin akcije: odobravanje, brisanje, promjena role, uplate
create table if not exists public.admin_audit_log (
  id           bigserial    primary key,
  admin_id     uuid         references auth.users(id) on delete set null,  -- nullable: log stays if admin deleted
  action       text         not null,
  target_table text,
  target_id    text,
  old_value    jsonb,
  new_value    jsonb,
  note         text,
  ip_address   text,
  created_at   timestamptz  not null default now()
);

create index if not exists idx_audit_log_admin
  on public.admin_audit_log (admin_id, created_at desc);

create index if not exists idx_audit_log_action
  on public.admin_audit_log (action, created_at desc);

create index if not exists idx_audit_log_target
  on public.admin_audit_log (target_table, target_id);

alter table public.admin_audit_log enable row level security;

drop policy if exists "audit_admin_read" on public.admin_audit_log;
create policy "audit_admin_read" on public.admin_audit_log
  for select to authenticated
  using (public.is_admin());

drop policy if exists "audit_admin_insert" on public.admin_audit_log;
create policy "audit_admin_insert" on public.admin_audit_log
  for insert to authenticated
  with check (public.is_admin());

-- ── 2. TRIGGER: auto-log promjene role u profiles ────────────
create or replace function public.log_role_change()
returns trigger
language plpgsql security definer
set search_path = public as $$
begin
  if old.role is distinct from new.role then
    insert into public.admin_audit_log
      (admin_id, action, target_table, target_id, old_value, new_value)
    values (
      auth.uid(),
      'role_change',
      'profiles',
      new.id::text,
      jsonb_build_object('role', old.role),
      jsonb_build_object('role', new.role)
    );
  end if;
  return new;
end;
$$;

drop trigger if exists trg_log_role_change on public.profiles;
create trigger trg_log_role_change
  after update of role on public.profiles
  for each row execute function public.log_role_change();

-- ── 3. TRIGGER: auto-log promjene approved na companies ──────
create or replace function public.log_company_approval()
returns trigger
language plpgsql security definer
set search_path = public as $$
begin
  if old.approved is distinct from new.approved then
    insert into public.admin_audit_log
      (admin_id, action, target_table, target_id, old_value, new_value)
    values (
      auth.uid(),
      case when new.approved then 'company_approved' else 'company_hidden' end,
      'companies',
      new.id::text,
      jsonb_build_object('approved', old.approved, 'name', old.name),
      jsonb_build_object('approved', new.approved, 'name', new.name)
    );
  end if;
  return new;
end;
$$;

drop trigger if exists trg_log_company_approval on public.companies;
create trigger trg_log_company_approval
  after update of approved on public.companies
  for each row execute function public.log_company_approval();

-- ── 4. TRIGGER: auto-log promjene status na jobs ─────────────
create or replace function public.log_job_status_change()
returns trigger
language plpgsql security definer
set search_path = public as $$
begin
  if old.status is distinct from new.status then
    insert into public.admin_audit_log
      (admin_id, action, target_table, target_id, old_value, new_value)
    values (
      auth.uid(),
      'job_status_change',
      'jobs',
      new.id::text,
      jsonb_build_object('status', old.status, 'title', old.title),
      jsonb_build_object('status', new.status, 'title', new.title)
    );
  end if;
  return new;
end;
$$;

drop trigger if exists trg_log_job_status on public.jobs;
create trigger trg_log_job_status
  after update of status on public.jobs
  for each row execute function public.log_job_status_change();

-- ── 5. TRIGGER: auto-log payment proof potvrde ───────────────
create or replace function public.log_payment_proof_action()
returns trigger
language plpgsql security definer
set search_path = public as $$
begin
  if old.status is distinct from new.status then
    insert into public.admin_audit_log
      (admin_id, action, target_table, target_id, old_value, new_value)
    values (
      auth.uid(),
      case
        when new.status = 'approved' then 'payment_confirmed'
        when new.status = 'rejected' then 'payment_rejected'
        else 'payment_status_change'
      end,
      'payment_proofs',
      new.id::text,
      jsonb_build_object('status', old.status),
      jsonb_build_object('status', new.status)
    );
  end if;
  return new;
end;
$$;

drop trigger if exists trg_log_payment_proof on public.payment_proofs;
create trigger trg_log_payment_proof
  after update of status on public.payment_proofs
  for each row execute function public.log_payment_proof_action();

-- ── 6. RPC: admin_read_audit_log ─────────────────────────────
-- Admin može čitati audit log filtrirano
create or replace function public.admin_read_audit_log(
  p_limit     integer default 50,
  p_offset    integer default 0,
  p_action    text    default null,
  p_table     text    default null
)
returns table (
  id           bigint,
  admin_email  text,
  action       text,
  target_table text,
  target_id    text,
  old_value    jsonb,
  new_value    jsonb,
  note         text,
  created_at   timestamptz
)
language plpgsql security definer
set search_path = public as $$
begin
  if not public.is_admin() then
    raise exception 'unauthorized';
  end if;

  return query
    select
      l.id,
      u.email as admin_email,
      l.action,
      l.target_table,
      l.target_id,
      l.old_value,
      l.new_value,
      l.note,
      l.created_at
    from public.admin_audit_log l
    left join auth.users u on u.id = l.admin_id
    where (p_action is null or l.action = p_action)
      and (p_table is null or l.target_table = p_table)
    order by l.created_at desc
    limit p_limit
    offset p_offset;
end;
$$;

-- ── 7. SPRJEČAVANJE ROLE ESCALATION ──────────────────────────
-- Korisnik ne smije sam sebi promijeniti rolu
-- Ovo je već djelimično pokriveno RLS-om ali dodajemo eksplicitnu provjeru
create or replace function public.prevent_self_role_change()
returns trigger
language plpgsql security definer
set search_path = public as $$
begin
  -- Blokira promjenu role ako korisnik nije admin i pokušava promijeniti svoju rolu
  if old.role is distinct from new.role
     and auth.uid() = new.id
     and not public.is_admin() then
    raise exception 'Ne možeš promijeniti svoju vlastitu rolu.';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_prevent_self_role_change on public.profiles;
create trigger trg_prevent_self_role_change
  before update of role on public.profiles
  for each row execute function public.prevent_self_role_change();

-- ── 8. PROVJERA: .env i Supabase setup ───────────────────────
-- Pokreni ovo ručno za provjeru da li je sve ispravno:
/*
SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;

SELECT tablename, rowsecurity FROM pg_tables
WHERE schemaname = 'public' ORDER BY tablename;

SELECT routine_name FROM information_schema.routines
WHERE routine_schema = 'public' ORDER BY routine_name;
*/

-- ── 9. ADMIN BOOTSTRAP ───────────────────────────────────────
-- Pokreni SAMO JEDNOM, zamijeni email sa stvarnim admin emailom:
-- UPDATE public.profiles SET role = 'admin' WHERE email = 'tvoj@email.com';

-- ── 10. CRON ZA EXPIRE PROMOTIONS (opcionalno) ───────────────
-- Zahtijeva pg_cron extension. Aktiviraj u Supabase Dashboard → Database → Extensions
-- Zatim pokreni:
/*
SELECT cron.schedule(
  'expire-job-promotions',
  '0 * * * *',
  'SELECT public.expire_job_promotions()'
);
*/

select 'supabase-audit-and-setup.sql: OK' as migration_status;
