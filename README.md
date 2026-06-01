# imaposla.me

Ovo je jedini produkcioni folder za sajt. Next.js aplikacija, Supabase SQL, backend plan, staticki prototip i asseti su spakovani ovdje da deploy i dalji rad idu iz jednog mjesta.

## Sta je prebaceno

- Prave Next rute bez `#/` adresa.
- Javni dio: pocetna, oglasi, detalj oglasa, gradovi, kategorije, firme, za firme, pravne stranice.
- Auth: prijava i registracija preko Supabase-a.
- Kandidat: pregled, biografija/CV builder, moje prijave.
- Firma: profil, oglasi, novi oglas, selekcija prijava, pretplata i dokaz uplate.
- Upravljanje: oglasi, firme, korisnici i dokazi uplata.
- Supabase query sloj u `lib/queries`.
- Browser Supabase klijent u `lib/supabase/client.ts`.
- Public Supabase klijent za server komponente u `lib/supabase/server.ts`.
- Middleware zastita za kandidat, firma i upravljanje rute.

## Pokretanje

```bash
cd imaposlame
npm install
npm run dev
```

Ako zelis env fajl:

```bash
copy .env.example .env.local
```

Env varijable su obavezne. Aplikacija namjerno ne koristi hardcoded Supabase fallback, da staging ili lokalni rad ne bi slucajno pisali u produkcionu bazu. Za produkciju na Vercel-u dodaj:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Ako deploy ide iz repozitorijuma koji sadrzi vise foldera, Vercel Root Directory mora biti `imaposlame`.

Poslije svake izmjene koja dira auth ili Supabase klijente pokreni fresh deploy. Login flow zavisi od Supabase SSR cookies, pa stale Vercel deployment moze i dalje pokazivati staro ponasanje.

Preporucene Vercel komande:

- Install command: `npm install`
- Build command: `npm run build`
- Output: default Next.js output koji Vercel sam prepoznaje

## Supabase

Za novi Supabase projekat redosljed je:

1. `supabase-schema.sql` - bazne tabele, enum tipovi, pocetni seed podaci i osnovni RLS.
2. `supabase-production.sql` - finalni Next.js backend dodaci, hardening, storage bucket, uplate i produkcione RLS politike.

`supabase-admin-hardening.sql` je zadrzan iz ranijeg prototipa kao istorijski/legacy hardening fajl. Za produkcioni Next deploy koristi `supabase-production.sql`, jer vec pokriva aktuelni auth, firme, oglase, uplate i storage tok.

`supabase-production.sql` dodaje:

- automatsko pravljenje `profiles` reda poslije registracije
- `cv_data` i `cv_updated_at` za CV builder
- `payment_proofs` tabelu i privatni `payment-proofs` bucket
- `confirm_payment_proof` RPC za sigurnu admin potvrdu uplate
- pravila za firme, oglase, planove, narudzbe, dokaze uplate i pretplate
- zastitu da korisnik ne moze sam sebi promijeniti ulogu, dodijeliti admin ulogu kroz signup metadata ili sam odobriti firmu

## Napomena

Next.js app je aktivna produkciona verzija. Stari staticki prototip je sacuvan u `legacy-static/` samo kao referenca, nije deploy entrypoint. Za launch obavezno proci QA kroz sva 4 tipa korisnika: gost, kandidat, firma i upravljanje.
