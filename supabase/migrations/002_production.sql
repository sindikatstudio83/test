-- Final backend pieces required by the Next.js imaposla.me app.
-- Run this as one new Supabase SQL query after the base schema.

create or replace function public.safe_user_role(value text)
returns public.user_role
language sql
immutable
as $$
  select case
    -- Signup metadata is user-controlled. Admin roles must be granted manually by an existing admin.
    when value in ('candidate', 'company') then value::public.user_role
    else 'candidate'::public.user_role
  end
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  )
$$;

alter table public.profiles
  add column if not exists cv_data jsonb not null default '{}'::jsonb,
  add column if not exists cv_updated_at timestamptz;

create or replace function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    public.safe_user_role(new.raw_user_meta_data->>'role')
  )
  on conflict (id) do update
    set email = excluded.email,
        updated_at = now();
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_profile on auth.users;
create trigger on_auth_user_created_profile
after insert on auth.users
for each row execute function public.handle_new_user_profile();

create or replace function public.prevent_profile_role_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.role is distinct from new.role and not public.is_admin() then
    raise exception 'Role can be changed only by admin.';
  end if;
  return new;
end;
$$;

drop trigger if exists prevent_profile_role_change on public.profiles;
create trigger prevent_profile_role_change
before update on public.profiles
for each row execute function public.prevent_profile_role_change();

create or replace function public.prevent_company_admin_field_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (
    old.approved is distinct from new.approved
    or old.owner_id is distinct from new.owner_id
  ) and not public.is_admin() then
    raise exception 'Company approval and ownership can be changed only by admin.';
  end if;
  return new;
end;
$$;

drop trigger if exists prevent_company_admin_field_change on public.companies;
create trigger prevent_company_admin_field_change
before update on public.companies
for each row execute function public.prevent_company_admin_field_change();

create table if not exists public.payment_proofs (
  id bigserial primary key,
  order_id bigint not null references public.orders(id) on delete cascade,
  company_id bigint not null references public.companies(id) on delete cascade,
  uploaded_by uuid not null references public.profiles(id) on delete cascade default auth.uid(),
  amount_eur numeric(10,2),
  proof_path text not null,
  file_name text,
  file_path text not null,
  note text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references public.profiles(id)
);

alter table public.payment_proofs
  add column if not exists uploaded_by uuid references public.profiles(id) on delete cascade default auth.uid(),
  add column if not exists amount_eur numeric(10,2),
  add column if not exists proof_path text,
  add column if not exists file_name text,
  add column if not exists note text,
  add column if not exists status text not null default 'pending',
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists reviewed_at timestamptz,
  add column if not exists reviewed_by uuid references public.profiles(id);

alter table public.payment_proofs enable row level security;

create unique index if not exists payment_proofs_one_approved_per_order
on public.payment_proofs(order_id)
where status = 'approved';

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'payment-proofs',
  'payment-proofs',
  false,
  10485760,
  array['image/png', 'image/jpeg', 'image/webp', 'application/pdf']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

create or replace function public.confirm_payment_proof(proof_id bigint)
returns table(activation_code text)
language plpgsql
security definer
set search_path = public
as $$
declare
  proof_row public.payment_proofs%rowtype;
  order_row public.orders%rowtype;
  credits integer := 0;
  generated_code text;
begin
  if not public.is_admin() then
    raise exception 'Only admin can confirm payment proofs.';
  end if;

  select * into proof_row
  from public.payment_proofs
  where id = proof_id
  for update;

  if not found then
    raise exception 'Payment proof not found.';
  end if;

  if proof_row.status <> 'pending' then
    raise exception 'Payment proof is already reviewed.';
  end if;

  select * into order_row
  from public.orders
  where id = proof_row.order_id
  for update;

  if not found then
    raise exception 'Connected order not found.';
  end if;

  if order_row.status <> 'pending' then
    raise exception 'Connected order is already reviewed.';
  end if;

  select coalesce(unlock_credits, 0) into credits
  from public.plans
  where id = order_row.plan_id;

  generated_code := coalesce(order_row.activation_code, 'IP-' || extract(epoch from clock_timestamp())::bigint::text);

  update public.orders
  set status = 'paid',
      confirmed_at = now(),
      confirmed_by = auth.uid(),
      activation_code = generated_code
  where id = order_row.id;

  update public.payment_proofs
  set status = 'approved',
      reviewed_at = now(),
      reviewed_by = auth.uid()
  where id = proof_row.id;

  insert into public.subscriptions (company_id, plan_id, unlock_credits_remaining)
  values (order_row.company_id, order_row.plan_id, credits);

  activation_code := generated_code;
  return next;
end;
$$;

revoke all on function public.confirm_payment_proof(bigint) from public;
grant execute on function public.confirm_payment_proof(bigint) to authenticated;

drop policy if exists "profiles own update" on public.profiles;
create policy "profiles own update" on public.profiles
for update
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists "profiles admin read" on public.profiles;
create policy "profiles admin read" on public.profiles
for select
using ((select public.is_admin()));

drop policy if exists "profiles admin update" on public.profiles;
create policy "profiles admin update" on public.profiles
for update
using ((select public.is_admin()))
with check ((select public.is_admin()));

drop policy if exists "company reads applicant profiles" on public.profiles;
create policy "company reads applicant profiles" on public.profiles
for select
using (
  id = (select auth.uid())
  or (select public.is_admin())
  or exists (
    select 1
    from public.job_applications a
    join public.jobs j on j.id = a.job_id
    join public.companies c on c.id = j.company_id
    where a.candidate_id = profiles.id
      and c.owner_id = (select auth.uid())
  )
);

drop policy if exists "public approved companies" on public.companies;
create policy "public approved companies" on public.companies
for select using (approved = true or owner_id = auth.uid() or public.is_admin());

drop policy if exists "company writes own company" on public.companies;
drop policy if exists "company inserts own unapproved company" on public.companies;
create policy "company inserts own unapproved company" on public.companies
for insert
with check (
  owner_id = (select auth.uid())
  and approved = false
);

drop policy if exists "company updates own company profile" on public.companies;
create policy "company updates own company profile" on public.companies
for update
using (owner_id = (select auth.uid()))
with check (owner_id = (select auth.uid()));

drop policy if exists "public categories read" on public.categories;
create policy "public categories read" on public.categories
for select using (true);

drop policy if exists "public cities read" on public.cities;
create policy "public cities read" on public.cities
for select using (true);

drop policy if exists "public plans read" on public.plans;
create policy "public plans read" on public.plans
for select using (true);

drop policy if exists "admin manages jobs" on public.jobs;
create policy "admin manages jobs" on public.jobs
for all
using ((select public.is_admin()))
with check ((select public.is_admin()));

-- Remove the permissive base policy before adding production-specific job access.
drop policy if exists "company owns jobs" on public.jobs;
drop policy if exists "company insert own jobs" on public.jobs;
drop policy if exists "company update own jobs" on public.jobs;

drop policy if exists "public active jobs" on public.jobs;
create policy "public active jobs" on public.jobs
for select
using (
  status = 'active'
  or (select public.is_admin())
  or exists (
    select 1 from public.companies c
    where c.id = jobs.company_id and c.owner_id = (select auth.uid())
  )
);

drop policy if exists "company inserts own pending jobs" on public.jobs;
create policy "company inserts own pending jobs" on public.jobs
for insert
with check (
  status = 'pending_review'
  and featured = false
  and exists (
    select 1 from public.companies c
    where c.id = jobs.company_id
      and c.owner_id = (select auth.uid())
      and c.approved = true
  )
);

drop policy if exists "company updates own non-active jobs" on public.jobs;
create policy "company updates own non-active jobs" on public.jobs
for update
using (
  exists (
    select 1 from public.companies c
    where c.id = jobs.company_id and c.owner_id = (select auth.uid())
  )
)
with check (
  status in ('draft', 'pending_review', 'paused')
  and featured = false
  and exists (
    select 1 from public.companies c
    where c.id = jobs.company_id and c.owner_id = (select auth.uid())
  )
);

drop policy if exists "candidate inserts own applications" on public.job_applications;
drop policy if exists "candidate creates own applications" on public.job_applications;
create policy "candidate inserts own active job applications" on public.job_applications
for insert
with check (
  candidate_id = (select auth.uid())
  and exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid())
      and p.role = 'candidate'
  )
  and exists (
    select 1 from public.jobs j
    where j.id = job_applications.job_id
      and j.status = 'active'
  )
);

drop policy if exists "company updates applications for own jobs" on public.job_applications;
create policy "company updates applications for own jobs" on public.job_applications
for update
using (
  public.is_admin()
  or exists (
    select 1 from public.jobs j
    join public.companies c on c.id = j.company_id
    where j.id = job_applications.job_id and c.owner_id = auth.uid()
  )
)
with check (
  public.is_admin()
  or exists (
    select 1 from public.jobs j
    join public.companies c on c.id = j.company_id
    where j.id = job_applications.job_id and c.owner_id = auth.uid()
  )
);

drop policy if exists "company owns orders" on public.orders;
drop policy if exists "admin manages orders" on public.orders;
drop policy if exists "company reads own orders" on public.orders;
drop policy if exists "company creates own pending orders" on public.orders;
drop policy if exists "company deletes own pending orders" on public.orders;

create policy "admin manages orders" on public.orders
for all
using (public.is_admin())
with check (public.is_admin());

create policy "company reads own orders" on public.orders
for select
using (
  exists (
    select 1 from public.companies c
    where c.id = orders.company_id and c.owner_id = auth.uid()
  )
);

create policy "company creates own pending orders" on public.orders
for insert
with check (
  status = 'pending'
  and exists (
    select 1 from public.companies c
    where c.id = orders.company_id and c.owner_id = auth.uid()
  )
);

create policy "company deletes own pending orders" on public.orders
for delete
using (
  status = 'pending'
  and exists (
    select 1 from public.companies c
    where c.id = orders.company_id and c.owner_id = auth.uid()
  )
);

drop policy if exists "company reads own subscriptions" on public.subscriptions;
create policy "company reads own subscriptions" on public.subscriptions
for select
using (
  public.is_admin()
  or exists (
    select 1 from public.companies c
    where c.id = subscriptions.company_id and c.owner_id = auth.uid()
  )
);

drop policy if exists "admin inserts subscriptions" on public.subscriptions;
create policy "admin inserts subscriptions" on public.subscriptions
for insert
with check (public.is_admin());

drop policy if exists "company reads own payment proofs" on public.payment_proofs;
create policy "company reads own payment proofs" on public.payment_proofs
for select
using (
  public.is_admin()
  or exists (
    select 1 from public.companies c
    where c.id = payment_proofs.company_id and c.owner_id = auth.uid()
  )
);

drop policy if exists "company inserts own payment proofs" on public.payment_proofs;
create policy "company inserts own payment proofs" on public.payment_proofs
for insert
with check (
  status = 'pending'
  and uploaded_by = (select auth.uid())
  and exists (
    select 1 from public.companies c
    join public.orders o on o.company_id = c.id
    where c.id = payment_proofs.company_id
      and o.id = payment_proofs.order_id
      and o.status = 'pending'
      and c.owner_id = (select auth.uid())
  )
);

drop policy if exists "admin updates payment proofs" on public.payment_proofs;
create policy "admin updates payment proofs" on public.payment_proofs
for update
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "payment proof owner uploads" on storage.objects;
drop policy if exists "company uploads own payment proofs" on storage.objects;
create policy "payment proof owner uploads" on storage.objects
for insert
with check (
  bucket_id = 'payment-proofs'
  and exists (
    select 1 from public.companies c
    where c.owner_id = (select auth.uid())
      and c.id::text = split_part(name, '/', 1)
  )
);

drop policy if exists "payment proof owner reads" on storage.objects;
drop policy if exists "company reads own payment proof files" on storage.objects;
drop policy if exists "admin reads payment proof files" on storage.objects;
create policy "payment proof owner reads" on storage.objects
for select
using (
  bucket_id = 'payment-proofs'
  and (
    (select public.is_admin())
    or exists (
      select 1 from public.companies c
      where c.owner_id = (select auth.uid())
        and c.id::text = split_part(name, '/', 1)
    )
  )
);
