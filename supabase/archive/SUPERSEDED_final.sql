-- ══════════════════════════════════════════════════════════════════════
-- supabase-final.sql
-- Finalne produkcijske popravke za imaposla.me
-- Pokreni u: Supabase Dashboard → SQL Editor
-- Sigurno za postojeće podatke
-- ══════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────
-- 1. FTS generated column za full-text search na jobs
-- ─────────────────────────────────────────────────────────────────────
alter table public.jobs
  add column if not exists fts tsvector
    generated always as (
      to_tsvector('simple',
        coalesce(title, '') || ' ' ||
        coalesce(description, '') || ' ' ||
        coalesce(contract_type, '') || ' ' ||
        coalesce(salary_text, '')
      )
    ) stored;

create index if not exists idx_jobs_fts on public.jobs using gin(fts);


-- ─────────────────────────────────────────────────────────────────────
-- 2. RPC: firma pauzira vlastiti oglas
-- ─────────────────────────────────────────────────────────────────────
create or replace function public.company_pause_job(p_job_id bigint)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_company_id bigint;
begin
  -- Provjeri da li firma posjeduje oglas
  select j.company_id into v_company_id
  from public.jobs j
  join public.companies c on c.id = j.company_id
  where j.id = p_job_id
    and c.owner_id = auth.uid()
    and j.status = 'active';

  if not found then
    raise exception 'Oglas nije pronađen ili nemate dozvolu za pauziranje.';
  end if;

  update public.jobs set status = 'paused', updated_at = now()
  where id = p_job_id;

  return jsonb_build_object('success', true, 'status', 'paused');
end;
$$;

grant execute on function public.company_pause_job(bigint) to authenticated;


-- ─────────────────────────────────────────────────────────────────────
-- 3. RPC: firma vraća pauziran oglas na pregled
-- ─────────────────────────────────────────────────────────────────────
create or replace function public.company_submit_for_review(p_job_id bigint)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_company_id bigint;
begin
  select j.company_id into v_company_id
  from public.jobs j
  join public.companies c on c.id = j.company_id
  where j.id = p_job_id
    and c.owner_id = auth.uid()
    and j.status in ('paused', 'rejected', 'draft');

  if not found then
    raise exception 'Oglas nije pronađen ili nije u ispravnom statusu za slanje na pregled.';
  end if;

  update public.jobs set status = 'pending_review', updated_at = now()
  where id = p_job_id;

  return jsonb_build_object('success', true, 'status', 'pending_review');
end;
$$;

grant execute on function public.company_submit_for_review(bigint) to authenticated;


-- ─────────────────────────────────────────────────────────────────────
-- 4. RPC: firma arhivira/briše oglas (samo draft/paused/rejected/expired)
-- ─────────────────────────────────────────────────────────────────────
create or replace function public.company_delete_job(p_job_id bigint)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.jobs
  where id = p_job_id
    and status in ('draft', 'paused', 'rejected', 'expired')
    and company_id in (
      select id from public.companies where owner_id = auth.uid()
    );

  if not found then
    raise exception 'Oglas nije pronađen, nije u ispravnom statusu, ili nemate dozvolu.';
  end if;

  return jsonb_build_object('success', true);
end;
$$;

grant execute on function public.company_delete_job(bigint) to authenticated;


-- ─────────────────────────────────────────────────────────────────────
-- 5. REVOKE execute od internih funkcija (trigger-only)
-- ─────────────────────────────────────────────────────────────────────
revoke execute on function public.notify_on_application() from public, anon, authenticated;
revoke execute on function public.notify_company_approved() from public, anon, authenticated;
revoke execute on function public.expire_old_jobs() from public, anon;

-- handle_new_user je trigger, ne treba biti javni RPC
do $$ begin
  if exists (select 1 from pg_proc where proname = 'handle_new_user' and pronamespace = 'public'::regnamespace) then
    execute 'revoke execute on function public.handle_new_user() from public, anon, authenticated';
  end if;
end $$;

-- prevent_role_escalation je trigger-only
do $$ begin
  if exists (select 1 from pg_proc where proname = 'prevent_role_escalation' and pronamespace = 'public'::regnamespace) then
    execute 'revoke execute on function public.prevent_role_escalation() from public, anon, authenticated';
  end if;
end $$;


-- ─────────────────────────────────────────────────────────────────────
-- 6. Duple firme po owneru — provjera
--    Ne dodajemo unique constraint automatski jer postoje duplikati.
--    Provjeri i ručno očisti:
-- ─────────────────────────────────────────────────────────────────────
select
  owner_id,
  count(*) as firma_count,
  array_agg(id order by created_at) as company_ids,
  array_agg(name order by created_at) as company_names
from public.companies
group by owner_id
having count(*) > 1;


-- ─────────────────────────────────────────────────────────────────────
-- 7. application_events i ats_comments — dodaj policy ako tabele postoje
-- ─────────────────────────────────────────────────────────────────────
do $$ begin
  if exists (select 1 from information_schema.tables where table_name = 'application_events' and table_schema = 'public') then
    execute $p$
      drop policy if exists "app_events_company_read" on public.application_events;
      create policy "app_events_company_read" on public.application_events
        for select using (
          exists (
            select 1 from public.job_applications ja
            join public.jobs j on j.id = ja.job_id
            join public.companies c on c.id = j.company_id
            where ja.id = application_events.application_id
              and c.owner_id = auth.uid()
          )
          or public.is_admin()
        );
    $p$;
  end if;

  if exists (select 1 from information_schema.tables where table_name = 'ats_comments' and table_schema = 'public') then
    execute $p$
      drop policy if exists "ats_comments_company" on public.ats_comments;
      create policy "ats_comments_company" on public.ats_comments
        for all using (
          exists (
            select 1 from public.job_applications ja
            join public.jobs j on j.id = ja.job_id
            join public.companies c on c.id = j.company_id
            where ja.id = ats_comments.application_id
              and c.owner_id = auth.uid()
          )
        );
    $p$;
  end if;
end $$;


-- ─────────────────────────────────────────────────────────────────────
-- 8. Finalna provjera
-- ─────────────────────────────────────────────────────────────────────
select
  'company_pause_job RPC'         as check_name,
  exists(select 1 from pg_proc where proname = 'company_pause_job') as ok
union all select
  'company_submit_for_review RPC',
  exists(select 1 from pg_proc where proname = 'company_submit_for_review')
union all select
  'company_delete_job RPC',
  exists(select 1 from pg_proc where proname = 'company_delete_job')
union all select
  'fts column on jobs',
  exists(select 1 from information_schema.columns where table_name = 'jobs' and column_name = 'fts');
