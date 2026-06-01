-- ══════════════════════════════════════════════════════════════════════
-- supabase-job-expiry.sql
-- Auto-arhiviranje oglasa 14 dana nakon isteka roka (deadline)
-- Pokreni u: Supabase Dashboard → SQL Editor
-- Sigurno za postojeće podatke
-- ══════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────
-- 1. Funkcija koja arhivira expired oglase
--    Oglas postaje 'expired' kada: deadline + 14 dana < danas
-- ─────────────────────────────────────────────────────────────────────
create or replace function public.expire_old_jobs()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.jobs
  set status = 'expired', updated_at = now()
  where status = 'active'
    and deadline is not null
    and deadline + interval '14 days' < current_date;

  -- Log koliko je arhivirano (opciono)
  raise notice 'expire_old_jobs: % oglasa arhivirano', found;
end;
$$;

grant execute on function public.expire_old_jobs() to service_role;

-- ─────────────────────────────────────────────────────────────────────
-- 2. Cron job koji pokreće expire_old_jobs() svaki dan u ponoć
--    Zahtijeva: Supabase → Database → Extensions → pg_cron = ON
-- ─────────────────────────────────────────────────────────────────────

-- Provjeri da li je pg_cron dostupan
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    -- Ukloni stari job ako postoji
    perform cron.unschedule('expire-old-jobs');

    -- Zakažemo novi: svaki dan u 00:05
    perform cron.schedule(
      'expire-old-jobs',
      '5 0 * * *',
      $cron$select public.expire_old_jobs();$cron$
    );

    raise notice 'pg_cron job "expire-old-jobs" uspješno zakazan (svaki dan 00:05).';
  else
    raise notice 'pg_cron nije aktivan. Pokreni expire_old_jobs() ručno ili aktiviraj pg_cron u Extensions.';
    raise notice 'Ručno pokretanje: SELECT public.expire_old_jobs();';
  end if;
end $$;

-- ─────────────────────────────────────────────────────────────────────
-- 3. Odmah arhiviraj sve koji su već prošli (retroaktivno)
-- ─────────────────────────────────────────────────────────────────────
select public.expire_old_jobs();

-- ─────────────────────────────────────────────────────────────────────
-- 4. Provjera
-- ─────────────────────────────────────────────────────────────────────
select
  status,
  count(*) as broj,
  min(deadline) as najstariji_rok,
  max(deadline) as najnoviji_rok
from public.jobs
group by status
order by status;
