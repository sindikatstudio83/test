-- ╔══════════════════════════════════════════════════════════════════════╗
-- ║  imaposla.me — STORAGE BUCKETS + RLS POLICIES                         ║
-- ║  Pokreni JEDNOM u Supabase SQL Editoru.                              ║
-- ║  Idempotentno: može se pokretati više puta bez štete.                ║
-- ╚══════════════════════════════════════════════════════════════════════╝

-- ──────────────────────────────────────────────────────────────────────
-- 1. KREIRANJE BUCKET-A
-- ──────────────────────────────────────────────────────────────────────

-- avatars: javan, max 2MB po fajlu, dozvoljen image/*
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

-- payment-proofs: privatan
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'payment-proofs', 'payment-proofs', false, 5242880,
  array['image/jpeg', 'image/png', 'application/pdf']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- ──────────────────────────────────────────────────────────────────────
-- 2. DROP STARIH POLICY-JA (idempotentno)
-- ──────────────────────────────────────────────────────────────────────

do $$
declare pol record;
begin
  for pol in
    select polname from pg_policy where polrelid = 'storage.objects'::regclass
    and (polname like 'avatars_%' or polname like 'logos_%' or polname like 'proofs_%'
         or polname like '%avatar%' or polname like '%logo%' or polname like '%proof%')
  loop
    execute format('drop policy if exists %I on storage.objects', pol.polname);
  end loop;
end $$;

-- ──────────────────────────────────────────────────────────────────────
-- 3. AVATARS POLICY-JE
-- ──────────────────────────────────────────────────────────────────────
-- Path konvencija: avatars/{user_id}/...

create policy "avatars_public_read" on storage.objects
  for select using (bucket_id = 'avatars');

create policy "avatars_owner_insert" on storage.objects
  for insert with check (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "avatars_owner_update" on storage.objects
  for update using (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "avatars_owner_delete" on storage.objects
  for delete using (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- ──────────────────────────────────────────────────────────────────────
-- 4. COMPANY-LOGOS POLICY-JE
-- ──────────────────────────────────────────────────────────────────────
-- Path konvencija: company-logos/{owner_user_id}/...

create policy "logos_public_read" on storage.objects
  for select using (bucket_id = 'company-logos');

create policy "logos_owner_insert" on storage.objects
  for insert with check (
    bucket_id = 'company-logos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "logos_owner_update" on storage.objects
  for update using (
    bucket_id = 'company-logos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "logos_owner_delete" on storage.objects
  for delete using (
    bucket_id = 'company-logos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- ──────────────────────────────────────────────────────────────────────
-- 5. PAYMENT-PROOFS POLICY-JE
-- ──────────────────────────────────────────────────────────────────────
-- Path konvencija: payment-proofs/{owner_user_id}/...

create policy "proofs_owner_read" on storage.objects
  for select using (
    bucket_id = 'payment-proofs'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "proofs_admin_read" on storage.objects
  for select using (
    bucket_id = 'payment-proofs' and public.is_admin()
  );

create policy "proofs_owner_upload" on storage.objects
  for insert with check (
    bucket_id = 'payment-proofs'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- ──────────────────────────────────────────────────────────────────────
-- ✓ GOTOVO
-- ──────────────────────────────────────────────────────────────────────
