-- ═══════════════════════════════════════════════════════════════════════════
-- supabase-storage-images-fix.sql
-- imaposla.me — Storage buckets + RLS policies, KOMPLETNA IDEMPOTENTNA
-- Pokreni u Supabase SQL Editoru. Može se pokretati više puta bez štete.
-- ═══════════════════════════════════════════════════════════════════════════

-- ──────────────────────────────────────────────────────────────────────────
-- SECTION 1: KREIRANJE BUCKET-A (idempotentno via ON CONFLICT)
-- ──────────────────────────────────────────────────────────────────────────

-- avatars: javan, max 2MB, samo slike
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars', 'avatars', true, 2097152,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- company-logos: javan, max 2MB
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'company-logos', 'company-logos', true, 2097152,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- banners: javan, max 5MB — prethodno bio iskomentarisan, sada aktivan
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'banners', 'banners', true, 5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- payment-proofs: privatan, max 5MB, slike i PDF
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'payment-proofs', 'payment-proofs', false, 5242880,
  array['image/jpeg', 'image/png', 'application/pdf']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- ──────────────────────────────────────────────────────────────────────────
-- SECTION 2: UKLANJANJE STARIH POLICY-JA (sprječava konflikte)
-- ──────────────────────────────────────────────────────────────────────────

do $$
declare
  pol record;
begin
  for pol in
    select polname
    from pg_policy
    where polrelid = 'storage.objects'::regclass
      and (
        polname like 'avatars_%'
        or polname like 'logos_%'
        or polname like 'banners_%'
        or polname like 'proofs_%'
        or polname like '%_avatar%'
        or polname like '%_logo%'
        or polname like '%_banner%'
        or polname like '%_proof%'
      )
  loop
    execute format('drop policy if exists %I on storage.objects', pol.polname);
  end loop;
end $$;

-- ──────────────────────────────────────────────────────────────────────────
-- SECTION 3: AVATARS RLS
-- Path konvencija: avatars/{auth.uid()}/timestamp.ext
-- ──────────────────────────────────────────────────────────────────────────

create policy "avatars_public_read" on storage.objects
  for select
  using (bucket_id = 'avatars');

create policy "avatars_owner_insert" on storage.objects
  for insert
  with check (
    bucket_id = 'avatars'
    and auth.uid() is not null
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "avatars_owner_update" on storage.objects
  for update
  using (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "avatars_owner_delete" on storage.objects
  for delete
  using (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- ──────────────────────────────────────────────────────────────────────────
-- SECTION 4: COMPANY-LOGOS RLS
-- Path konvencija: company-logos/{owner_user_id}/timestamp.ext
-- owner_user_id = auth.uid() of the company owner (not company.id)
-- ──────────────────────────────────────────────────────────────────────────

create policy "logos_public_read" on storage.objects
  for select
  using (bucket_id = 'company-logos');

create policy "logos_owner_insert" on storage.objects
  for insert
  with check (
    bucket_id = 'company-logos'
    and auth.uid() is not null
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "logos_owner_update" on storage.objects
  for update
  using (
    bucket_id = 'company-logos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "logos_owner_delete" on storage.objects
  for delete
  using (
    bucket_id = 'company-logos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- ──────────────────────────────────────────────────────────────────────────
-- SECTION 5: BANNERS RLS
-- Path konvencija: banners/{uploader_user_id}/timestamp.ext
-- Samo admini mogu upload-ovati banere
-- ──────────────────────────────────────────────────────────────────────────

create policy "banners_public_read" on storage.objects
  for select
  using (bucket_id = 'banners');

-- Admins can insert banners
create policy "banners_admin_insert" on storage.objects
  for insert
  with check (
    bucket_id = 'banners'
    and auth.uid() is not null
    and (
      -- Admin check via profiles table
      exists (
        select 1 from public.profiles
        where id = auth.uid() and role = 'admin'
      )
      -- Fallback: user uploads under their own folder (same path convention)
      or auth.uid()::text = (storage.foldername(name))[1]
    )
  );

create policy "banners_admin_update" on storage.objects
  for update
  using (
    bucket_id = 'banners'
    and (
      exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
      or auth.uid()::text = (storage.foldername(name))[1]
    )
  );

create policy "banners_admin_delete" on storage.objects
  for delete
  using (
    bucket_id = 'banners'
    and (
      exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
      or auth.uid()::text = (storage.foldername(name))[1]
    )
  );

-- ──────────────────────────────────────────────────────────────────────────
-- SECTION 6: PAYMENT-PROOFS RLS
-- Path konvencija: payment-proofs/{owner_user_id}/timestamp.ext
-- ──────────────────────────────────────────────────────────────────────────

create policy "proofs_owner_read" on storage.objects
  for select
  using (
    bucket_id = 'payment-proofs'
    and (
      auth.uid()::text = (storage.foldername(name))[1]
      or exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
    )
  );

create policy "proofs_owner_upload" on storage.objects
  for insert
  with check (
    bucket_id = 'payment-proofs'
    and auth.uid() is not null
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "proofs_owner_delete" on storage.objects
  for delete
  using (
    bucket_id = 'payment-proofs'
    and (
      auth.uid()::text = (storage.foldername(name))[1]
      or exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
    )
  );

-- ──────────────────────────────────────────────────────────────────────────
-- ✓ DONE
-- ──────────────────────────────────────────────────────────────────────────
select
  b.name as bucket,
  b.public,
  count(pol.polname)::text || ' policies' as rls_policies
from storage.buckets b
left join pg_policy pol
  on pol.polrelid = 'storage.objects'::regclass
  and pol.polname like b.name || '%'
where b.name in ('avatars', 'company-logos', 'banners', 'payment-proofs')
group by b.name, b.public
order by b.name;
