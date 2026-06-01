-- ════════════════════════════════════════════════════════════════════════════
-- 009_brzi_poslovi_hardening.sql — security views, protection triggers, RPCs,
--                                  notifications wiring for "Brzi poslovi"
-- ════════════════════════════════════════════════════════════════════════════
-- Run AFTER 008_brzi_poslovi.sql.
--
-- Adds:
--   • public_worker_profiles  — view WITHOUT contact fields (safe for anon)
--   • public_quick_gigs       — view of active gigs (safe for anon)
--   • get_worker_contact(id)  — RPC returning contact only to authed users,
--                               and only when worker opted in (show_phone)
--   • protection triggers      — block client updates to admin-only columns
--   • admin_set_worker_verified — RPC for verification
--   • notification triggers    — worker_messages, quick_gig_applications,
--                                worker status change, gig status change
-- ════════════════════════════════════════════════════════════════════════════

-- ── 1. SAFE PUBLIC VIEWS (no contact fields) ─────────────────────────────────

create or replace view public.public_worker_profiles as
select
  w.id, w.user_id, w.display_name, w.profession_id, w.profession_text,
  w.cities, w.availability, w.available_from, w.experience_years,
  w.price_text, w.languages, w.bio, w.photo_path,
  -- contact fields intentionally EXCLUDED
  w.show_phone,               -- expose the FLAG (not the number) so UI can show the contact button
  w.is_public, w.status, w.is_premium, w.premium_until, w.is_verified,
  w.slug, w.views, w.created_at, w.updated_at
from public.worker_profiles w
where w.status = 'active' and w.is_public = true;

-- View runs with the privileges of the querying role; underlying RLS still applies,
-- but since this view filters to public+active and omits contact columns, it is the
-- safe surface for anon/public reads.
grant select on public.public_worker_profiles to anon, authenticated;

create or replace view public.public_quick_gigs as
select
  g.id, g.posted_by, g.company_id, g.title, g.profession_id, g.city,
  g.gig_date, g.gig_timing, g.pay_text, g.description,
  g.is_urgent, g.is_featured, g.status, g.created_at, g.updated_at
from public.quick_gigs g
where g.status = 'active';

grant select on public.public_quick_gigs to anon, authenticated;

-- ── 2. CONTACT RPC — controlled, login-only, opt-in ──────────────────────────
-- Returns contact info ONLY to authenticated users, and phone/viber only when the
-- worker has show_phone = true. Owner & admin always get full contact.
create or replace function public.get_worker_contact(p_worker_id bigint)
returns table (
  contact_email text,
  contact_phone text,
  contact_viber text,
  show_phone boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_is_owner boolean;
  v_is_admin boolean;
begin
  -- Must be logged in
  if auth.uid() is null then
    return;
  end if;

  select (w.user_id = auth.uid()) into v_is_owner
  from public.worker_profiles w where w.id = p_worker_id;

  v_is_admin := public.is_admin();

  return query
  select
    w.contact_email,
    case when w.show_phone or v_is_owner or v_is_admin then w.contact_phone else null end,
    case when w.show_phone or v_is_owner or v_is_admin then w.contact_viber else null end,
    w.show_phone
  from public.worker_profiles w
  where w.id = p_worker_id
    and (w.status = 'active' and w.is_public = true or v_is_owner or v_is_admin);
end;
$$;

revoke all on function public.get_worker_contact(bigint) from public;
grant execute on function public.get_worker_contact(bigint) to authenticated;

-- ── 3. PROTECTION TRIGGERS — block client updates to admin-only columns ───────
-- Workers can update their own profile, but NOT status/premium/verified/views/slug.
-- Admin-only RPCs run as security definer and set a session flag to bypass.

create or replace function public.guard_worker_admin_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Allow when the change is made by an admin or via a definer RPC (flag set).
  if public.is_admin() or current_setting('app.admin_action', true) = '1' then
    return new;
  end if;

  -- Otherwise force admin-only columns to their OLD values (silently ignore tampering).
  new.status        := old.status;
  new.is_premium    := old.is_premium;
  new.premium_until := old.premium_until;
  new.is_verified   := old.is_verified;
  new.views         := old.views;
  new.slug          := old.slug;
  return new;
end;
$$;

drop trigger if exists trg_guard_worker_admin on public.worker_profiles;
create trigger trg_guard_worker_admin
  before update on public.worker_profiles
  for each row execute function public.guard_worker_admin_columns();

create or replace function public.guard_gig_admin_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.is_admin() or current_setting('app.admin_action', true) = '1' then
    return new;
  end if;
  new.status      := old.status;
  new.is_featured := old.is_featured;
  return new;
end;
$$;

drop trigger if exists trg_guard_gig_admin on public.quick_gigs;
create trigger trg_guard_gig_admin
  before update on public.quick_gigs
  for each row execute function public.guard_gig_admin_columns();

-- Re-create admin RPCs to set the bypass flag so the guard lets them through.
create or replace function public.admin_set_worker_status(p_worker_id bigint, p_status public.worker_status)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Not authorized'; end if;
  perform set_config('app.admin_action', '1', true);
  update public.worker_profiles set status = p_status, updated_at = now() where id = p_worker_id;
end; $$;

create or replace function public.admin_set_worker_premium(p_worker_id bigint, p_premium boolean, p_until timestamptz)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Not authorized'; end if;
  perform set_config('app.admin_action', '1', true);
  update public.worker_profiles
    set is_premium = p_premium, premium_until = p_until, updated_at = now()
    where id = p_worker_id;
end; $$;

create or replace function public.admin_set_worker_verified(p_worker_id bigint, p_verified boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Not authorized'; end if;
  perform set_config('app.admin_action', '1', true);
  update public.worker_profiles set is_verified = p_verified, updated_at = now() where id = p_worker_id;
end; $$;

create or replace function public.admin_set_gig_status(p_gig_id bigint, p_status public.gig_status)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Not authorized'; end if;
  perform set_config('app.admin_action', '1', true);
  update public.quick_gigs set status = p_status, updated_at = now() where id = p_gig_id;
end; $$;

create or replace function public.admin_set_gig_featured(p_gig_id bigint, p_featured boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Not authorized'; end if;
  perform set_config('app.admin_action', '1', true);
  update public.quick_gigs set is_featured = p_featured, updated_at = now() where id = p_gig_id;
end; $$;

-- increment_worker_view must also bypass the guard (updates views)
create or replace function public.increment_worker_view(p_worker_id bigint)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform set_config('app.admin_action', '1', true);
  update public.worker_profiles set views = views + 1 where id = p_worker_id and status = 'active';
end; $$;

revoke all on function public.admin_set_worker_verified(bigint, boolean) from public;
grant execute on function public.admin_set_worker_verified(bigint, boolean) to authenticated;
revoke all on function public.admin_set_gig_featured(bigint, boolean) from public;
grant execute on function public.admin_set_gig_featured(bigint, boolean) to authenticated;

-- ── 4. NOTIFICATIONS WIRING ──────────────────────────────────────────────────
-- Uses existing public.notifications table. Schema assumed:
--   recipient_id uuid, title text, message text, notification_type text, link text, read bool
-- Guarded with a to_regclass check so this migration is safe even if absent.

do $$
begin
  if to_regclass('public.notifications') is null then
    raise notice 'notifications table not found — skipping notification triggers';
    return;
  end if;

  -- New worker message → notify worker owner
  create or replace function public.notify_worker_message()
  returns trigger language plpgsql security definer set search_path = public as $fn$
  declare v_owner uuid; v_name text;
  begin
    select w.user_id, w.display_name into v_owner, v_name
    from public.worker_profiles w where w.id = new.worker_id;
    if v_owner is not null then
      insert into public.notifications (recipient_id, title, message, notification_type, link)
      values (v_owner, 'Novi upit za tvoj brzi profil',
              coalesce(new.from_name,'Korisnik') || ' ti je poslao poruku.',
              'worker_message', '/profil/brzi-kontakti');
    end if;
    return new;
  end; $fn$;

  drop trigger if exists trg_notify_worker_message on public.worker_messages;
  create trigger trg_notify_worker_message
    after insert on public.worker_messages
    for each row execute function public.notify_worker_message();

  -- New gig application → notify gig owner
  create or replace function public.notify_gig_application()
  returns trigger language plpgsql security definer set search_path = public as $fn$
  declare v_owner uuid; v_title text;
  begin
    select g.posted_by, g.title into v_owner, v_title
    from public.quick_gigs g where g.id = new.gig_id;
    if v_owner is not null then
      insert into public.notifications (recipient_id, title, message, notification_type, link)
      values (v_owner, 'Nova prijava na brzi angažman',
              'Kandidat se prijavio na: ' || coalesce(v_title,'angažman'),
              'gig_application', '/firma/brzi-angazman/' || new.gig_id);
    end if;
    return new;
  end; $fn$;

  drop trigger if exists trg_notify_gig_application on public.quick_gig_applications;
  create trigger trg_notify_gig_application
    after insert on public.quick_gig_applications
    for each row execute function public.notify_gig_application();

  -- Worker status change → notify worker
  create or replace function public.notify_worker_status()
  returns trigger language plpgsql security definer set search_path = public as $fn$
  begin
    if new.status is distinct from old.status then
      insert into public.notifications (recipient_id, title, message, notification_type, link)
      values (new.user_id,
              case new.status
                when 'active' then 'Tvoj brzi profil je odobren'
                when 'rejected' then 'Tvoj brzi profil je odbijen'
                when 'hidden' then 'Tvoj brzi profil je sakriven'
                else 'Status brzog profila promijenjen' end,
              'Novi status: ' || new.status,
              'worker_status', '/profil/brzi-profil');
    end if;
    return new;
  end; $fn$;

  drop trigger if exists trg_notify_worker_status on public.worker_profiles;
  create trigger trg_notify_worker_status
    after update on public.worker_profiles
    for each row execute function public.notify_worker_status();

  -- Gig status change → notify gig owner
  create or replace function public.notify_gig_status()
  returns trigger language plpgsql security definer set search_path = public as $fn$
  begin
    if new.status is distinct from old.status then
      insert into public.notifications (recipient_id, title, message, notification_type, link)
      values (new.posted_by,
              case new.status
                when 'active' then 'Tvoj brzi angažman je odobren'
                when 'rejected' then 'Tvoj brzi angažman je odbijen'
                else 'Status brzog angažmana promijenjen' end,
              coalesce(new.title,'Angažman'),
              'gig_status', '/firma/brzi-angazman/' || new.id);
    end if;
    return new;
  end; $fn$;

  drop trigger if exists trg_notify_gig_status on public.quick_gigs;
  create trigger trg_notify_gig_status
    after update on public.quick_gigs
    for each row execute function public.notify_gig_status();
end $$;

-- ── 5. SAVED WORKERS (firma bookmarks) ───────────────────────────────────────
create table if not exists public.saved_workers (
  id          bigserial primary key,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  worker_id   bigint not null references public.worker_profiles(id) on delete cascade,
  created_at  timestamptz not null default now(),
  unique(user_id, worker_id)
);
alter table public.saved_workers enable row level security;
create policy "saved_workers_owner_all" on public.saved_workers
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ── 6. PREMIUM REQUESTS (MVP — admin activates after payment) ────────────────
create table if not exists public.premium_requests (
  id          bigserial primary key,
  worker_id   bigint not null references public.worker_profiles(id) on delete cascade,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  plan        text not null default '30d',   -- '7d' | '30d' | 'season'
  note        text,
  status      text not null default 'pending', -- pending | paid | rejected
  created_at  timestamptz not null default now()
);
alter table public.premium_requests enable row level security;
create policy "premium_req_owner" on public.premium_requests
  for select using (user_id = auth.uid() or public.is_admin());
create policy "premium_req_insert" on public.premium_requests
  for insert with check (user_id = auth.uid());
create policy "premium_req_admin" on public.premium_requests
  for all using (public.is_admin()) with check (public.is_admin());

-- ════════════════════════════════════════════════════════════════════════════
-- DONE. Verify:
--   select * from public_worker_profiles limit 1;   -- must NOT include contact_*
--   select * from public_quick_gigs limit 1;
--   select proname from pg_proc where proname like 'admin_set_%';
-- ════════════════════════════════════════════════════════════════════════════
