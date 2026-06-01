-- Run this after the base schema. It keeps privileged approval checks out of
-- the public API surface and fixes older trigger setups that referenced
-- public.is_admin().

create schema if not exists private;

create or replace function private.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and role = 'admin'
  );
$$;

revoke all on function private.is_admin() from public;
grant execute on function private.is_admin() to authenticated;

drop policy if exists "admin reads profiles" on public.profiles;
create policy "admin reads profiles"
on public.profiles
for select
using (private.is_admin());

drop policy if exists "admin manages companies" on public.companies;
create policy "admin manages companies"
on public.companies
for all
using (private.is_admin())
with check (private.is_admin());

drop policy if exists "admin manages jobs" on public.jobs;
create policy "admin manages jobs"
on public.jobs
for all
using (private.is_admin())
with check (private.is_admin());

drop policy if exists "admin manages orders" on public.orders;
create policy "admin manages orders"
on public.orders
for all
using (private.is_admin())
with check (private.is_admin());

drop policy if exists "admin manages banners" on public.banners;
create policy "admin manages banners"
on public.banners
for all
using (private.is_admin())
with check (private.is_admin());

create or replace function public.prevent_company_self_approval()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.approved is distinct from old.approved and not private.is_admin() then
    raise exception 'Odobravanje firme može uraditi samo ovlašćeni nalog.';
  end if;

  return new;
end;
$$;

drop trigger if exists prevent_company_self_approval on public.companies;
create trigger prevent_company_self_approval
before update of approved on public.companies
for each row
execute function public.prevent_company_self_approval();

create or replace function public.prevent_company_job_moderation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    if (new.status is distinct from 'pending_review'::public.job_status or new.featured is true) and not private.is_admin() then
      raise exception 'Oglas mora proći provjeru prije javnog prikaza.';
    end if;
  end if;

  if tg_op = 'UPDATE' then
    if (new.status is distinct from old.status or new.featured is distinct from old.featured) and not private.is_admin() then
      raise exception 'Status i isticanje oglasa mijenja samo ovlašćeni nalog.';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists prevent_company_job_moderation_insert on public.jobs;
create trigger prevent_company_job_moderation_insert
before insert on public.jobs
for each row
execute function public.prevent_company_job_moderation();

drop trigger if exists prevent_company_job_moderation_update on public.jobs;
create trigger prevent_company_job_moderation_update
before update of status, featured on public.jobs
for each row
execute function public.prevent_company_job_moderation();
