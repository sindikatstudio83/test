# Supabase Migrations

## Source of Truth

Za novi Supabase projekat pokreni migrations **redom** iz `migrations/`:

```
001_schema.sql              — bazne tabele, enum tipovi, RLS
002_production.sql          — auth triggeri, cv_data, payment_proofs, SIGURNA is_admin()
003_security_fixes.sql      — is_admin() iz profiles (ne JWT), stezanje notification policy-ja
004_growth_features.sql     — baneri, hero carousel, quick_job, kreativni templati
005_live_hardening.sql      — revoke execute, database indeksi za performanse
006_rpc_ownership.sql       — RPC ownership security patch
007_job_expiry.sql          — job expiry cron / trigger
```

## Seed

```
seed/seed.sql               — demo podaci za development/staging
```

## Email Templati

```
emails/confirm.html         — Supabase email za potvrdu naloga
emails/reset.html           — Supabase email za reset lozinke
```

## ⚠️ Archive — NE POKRETATI

Fajlovi u `archive/` su **zastarjeli ili sigurnosno problematični**.
Posebno **NIKAD ne pokretati**:

- `UNSAFE_auth-complete_has_jwt-metadata-admin.sql`
  → Ova datoteka sadrži `is_admin()` koja čita `auth.jwt()->user_metadata`,
    što je korisnik-editabilno polje. Može se koristiti za privilege escalation.
    Supersedovan od `002_production.sql` i `003_security_fixes.sql`.

- `SUPERSEDED_rls-fix.sql`
  → Sadrži mješanu OR logiku za `is_admin()` — JWT metadata može pobjediti profiles provjeru.

## Provjera aktivne is_admin() na produkcijskoj bazi

Pokrenuti u Supabase SQL Editoru:
```sql
SELECT prosrc FROM pg_proc
WHERE proname = 'is_admin'
  AND pronamespace = 'public'::regnamespace;
```

Ispravna (SIGURNA) verzija treba sadržati:
```sql
select exists (
  select 1 from public.profiles
  where id = auth.uid()
    and role in ('admin', 'superadmin')
)
```

Ako vidite `user_metadata` — odmah pokrenite `003_security_fixes.sql`.

## 008_brzi_poslovi.sql — "Brzi poslovi" feature

Dodaje cijelu novu sekciju: brzi profili radnika, brzi angažmani, interesovanja, poruke.

```
008_brzi_poslovi.sql        — professions, worker_profiles, worker_portfolio,
                              quick_gigs, quick_gig_applications, worker_messages,
                              candidate_interests, weekly_digest_log + RLS + RPC + storage bucket
```

### Ručni koraci nakon pokretanja migracije:

1. **Pokreni migraciju** u Supabase SQL Editor:
   - Kopiraj cijeli sadržaj `008_brzi_poslovi.sql` i pokreni.
   - Migracija je idempotentna za bucket (`on conflict do nothing`).

2. **Provjeri da je seed zanimanja prošao:**
   ```sql
   SELECT count(*) FROM professions;  -- očekivano: 18
   ```

3. **Provjeri storage bucket:**
   - Supabase Dashboard → Storage → mora postojati bucket `worker-photos` (public).
   - Ako migracija nije kreirala bucket (stariji Supabase), kreiraj ručno:
     Storage → New bucket → ime `worker-photos` → Public bucket: ON.

4. **Provjeri RLS:**
   ```sql
   SELECT relname, relrowsecurity FROM pg_class
   WHERE relname IN ('worker_profiles','quick_gigs','worker_messages','candidate_interests');
   -- svi moraju imati relrowsecurity = true
   ```

5. **Provjeri da is_admin() postoji** (koristi se u RLS politikama):
   ```sql
   SELECT prosrc FROM pg_proc WHERE proname = 'is_admin';
   -- mora sadržati "profiles", NE "user_metadata"
   ```

### Nedjeljni email (NIJE u migraciji — zaseban setup)

Email se NE šalje automatski iz baze. Treba postaviti **Supabase Edge Function** + email servis (Resend/SendGrid):

1. Kreiraj Resend nalog → dobij API ključ.
2. Kreiraj Edge Function `weekly-digest` koja:
   - Čita `candidate_interests` gdje `email_enabled = true`.
   - Za svakog korisnika nalazi aktivne `jobs` i `quick_gigs` koji odgovaraju (profesija/grad).
   - Šalje email preko Resend-a.
   - Upisuje u `weekly_digest_log` (idempotency).
3. Postavi Supabase cron (pg_cron ili Dashboard → Edge Functions → Schedule):
   ```
   0 9 * * 1   -- svakog ponedjeljka u 09:00
   ```

Edge Function kod i template NISU dio ovog koda — to je sljedeća faza (Faza 1.5).

## 009_brzi_poslovi_hardening.sql — sigurnosno učvršćivanje

Pokreni ODMAH NAKON 008. Dodaje:

```
009_brzi_poslovi_hardening.sql
  • public_worker_profiles   — VIEW bez kontakt polja (siguran za anon)
  • public_quick_gigs        — VIEW aktivnih angažmana
  • get_worker_contact(id)   — RPC, kontakt SAMO za prijavljene + opt-in telefon
  • zaštitni triggeri          — blokiraju client update na admin-only kolone
  • admin_set_worker_verified / admin_set_gig_featured — RPC
  • notifikacioni triggeri     — poruke, prijave, promjene statusa
  • saved_workers, premium_requests — nove tabele
```

### KRITIČNO — redoslijed i provjere

1. Pokreni `008_brzi_poslovi.sql` PA `009_brzi_poslovi_hardening.sql`.

2. **Provjeri da javni view NE sadrži kontakt:**
   ```sql
   SELECT * FROM public_worker_profiles LIMIT 1;
   -- NE smije imati contact_phone / contact_viber / contact_email
   ```

3. **Provjeri RPC-eve:**
   ```sql
   SELECT proname FROM pg_proc WHERE proname IN
   ('get_worker_contact','admin_set_worker_status','admin_set_worker_premium',
    'admin_set_worker_verified','admin_set_gig_status','admin_set_gig_featured');
   -- mora vratiti svih 6
   ```

4. **Notifikacije:** Migracija detektuje `notifications` tabelu automatski.
   Ako je nema, triggeri se preskaču (vidiš NOTICE). Pretpostavljena šema:
   `recipient_id uuid, title text, message text, notification_type text, link text, read bool`.
   Ako se tvoja šema razlikuje, prilagodi INSERT u funkcijama
   `notify_worker_message`, `notify_gig_application`, `notify_worker_status`, `notify_gig_status`.

5. **Test zaštite (kao običan korisnik, ne admin):**
   ```sql
   -- pokušaj da sam sebi daš premium → mora ostati false
   UPDATE worker_profiles SET is_premium = true WHERE user_id = auth.uid();
   SELECT is_premium FROM worker_profiles WHERE user_id = auth.uid();  -- false
   ```

### Weekly email — Edge Function

Fajl: `supabase/functions/weekly-digest/index.ts`

Deploy:
```bash
supabase functions deploy weekly-digest --no-verify-jwt
supabase secrets set RESEND_API_KEY=re_xxx
supabase secrets set DIGEST_FROM_EMAIL="imaposla.me <noreply@imaposla.me>"
supabase secrets set SITE_URL=https://imaposla.me
```
Cron (Dashboard → Edge Functions → Schedule): `0 9 * * 1` (ponedjeljak 09:00).
Bez `RESEND_API_KEY` funkcija radi u dry-run modu (samo loguje).
