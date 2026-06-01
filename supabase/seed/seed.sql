-- ══════════════════════════════════════════════════════════════════════
-- supabase-seed-data.sql
-- Mock podaci za testiranje imaposla.me platforme
-- Pokreni u: Supabase Dashboard → SQL Editor
-- SIGURNO: koristi INSERT ... ON CONFLICT DO NOTHING — neće brisati postojeće podatke
--
-- PRIJE POKRETANJA:
-- Zamijeni 'ZAMIJENI_SA_TVOJIM_ADMIN_UUID' sa pravim UUID-om tvog admin naloga.
-- UUID nađeš u: Supabase → Authentication → Users → klikni na admin usera → kopiraj UUID
-- ══════════════════════════════════════════════════════════════════════

-- Postavi UUID svog admin naloga ovdje:
do $$ begin
  if not exists (
    select 1 from public.profiles where role = 'admin'
  ) then
    raise exception 'Nema admin profila. Prvo pokreni: UPDATE profiles SET role=''admin'' WHERE email=''tvoj@email.com'';';
  end if;
end $$;


-- ──────────────────────────────────────────────────────────────────────
-- 1. GRADOVI
-- ──────────────────────────────────────────────────────────────────────
insert into public.cities (name, slug) values
  ('Podgorica',    'podgorica'),
  ('Bar',          'bar'),
  ('Budva',        'budva'),
  ('Nikšić',       'niksic'),
  ('Herceg Novi',  'herceg-novi'),
  ('Kotor',        'kotor'),
  ('Tivat',        'tivat'),
  ('Bijelo Polje', 'bijelo-polje'),
  ('Cetinje',      'cetinje'),
  ('Ulcinj',       'ulcinj'),
  ('Berane',       'berane'),
  ('Pljevlja',     'pljevlja'),
  ('Mojkovac',     'mojkovac'),
  ('Žabljak',      'zabljak'),
  ('Rožaje',       'rozaje')
on conflict (slug) do nothing;


-- ──────────────────────────────────────────────────────────────────────
-- 2. KATEGORIJE
-- ──────────────────────────────────────────────────────────────────────
insert into public.categories (name, slug) values
  ('IT i softver',              'it-i-softver'),
  ('Turizam i ugostiteljstvo',  'turizam-i-ugostiteljstvo'),
  ('Građevinarstvo',            'gradjevinarstvo'),
  ('Zdravstvo i farmacija',     'zdravstvo-i-farmacija'),
  ('Obrazovanje',               'obrazovanje'),
  ('Finansije i računovodstvo', 'finansije-i-racunovodstvo'),
  ('Marketing i oglašavanje',   'marketing-i-oglasavanje'),
  ('Prodaja i maloprodaja',     'prodaja-i-maloprodaja'),
  ('Administracija',            'administracija'),
  ('Transport i logistika',     'transport-i-logistika'),
  ('Pravo i pravni poslovi',    'pravo-i-pravni-poslovi'),
  ('Mediji i novinarstvo',      'mediji-i-novinarstvo'),
  ('Inženjering',               'inzenjering'),
  ('Usluge i zanatstvo',        'usluge-i-zanatstvo'),
  ('Ostalo',                    'ostalo')
on conflict (slug) do nothing;


-- ──────────────────────────────────────────────────────────────────────
-- 3. PLANOVI / PAKETI
-- ──────────────────────────────────────────────────────────────────────
insert into public.plans (name, price_eur, active_jobs, unlock_credits, features) values
  (
    'Start',
    49,
    3,
    0,
    array[
      '3 aktivna oglasa istovremeno',
      'Oglas aktivan 30 dana',
      'Osnovna ATS selekcija',
      'Email podrška'
    ]
  ),
  (
    'Business',
    99,
    10,
    5,
    array[
      '10 aktivnih oglasa istovremeno',
      'Oglas aktivan 60 dana',
      'Kompletna ATS selekcija',
      '5 istaknuta oglasa',
      'Prioritetna podrška'
    ]
  ),
  (
    'Enterprise',
    199,
    999,
    20,
    array[
      'Neograničeni oglasi',
      'Oglas aktivan 90 dana',
      'Kompletna ATS selekcija',
      '20 istaknutih oglasa',
      'Branding na oglasima',
      'Dedicated account manager'
    ]
  )
on conflict (name) do nothing;


-- ──────────────────────────────────────────────────────────────────────
-- 4. FIRME — vlasnik je admin profil (privremeno za testiranje)
--    Nakon testiranja, svaka firma treba biti registrovana sa pravim nalogom
-- ──────────────────────────────────────────────────────────────────────

-- Uzimamo admin profile ID automatski
do $$
declare
  v_admin_id uuid;
  v_podgorica_id bigint;
  v_bar_id bigint;
  v_budva_id bigint;
  v_herceg_novi_id bigint;
  v_tivat_id bigint;
  v_niksic_id bigint;

  v_it_id bigint;
  v_turizam_id bigint;
  v_gradjevina_id bigint;
  v_zdravstvo_id bigint;
  v_finansije_id bigint;
  v_marketing_id bigint;
  v_prodaja_id bigint;
  v_admin_kat_id bigint;
  v_transport_id bigint;
  v_obrazovanje_id bigint;

  v_co1 bigint; v_co2 bigint; v_co3 bigint; v_co4 bigint; v_co5 bigint; v_co6 bigint;

begin

  -- Dohvati admin ID
  select id into v_admin_id from public.profiles where role = 'admin' limit 1;
  if v_admin_id is null then
    raise exception 'Admin profil nije pronađen.';
  end if;

  -- Dohvati grad IDs
  select id into v_podgorica_id   from public.cities where slug = 'podgorica';
  select id into v_bar_id         from public.cities where slug = 'bar';
  select id into v_budva_id       from public.cities where slug = 'budva';
  select id into v_herceg_novi_id from public.cities where slug = 'herceg-novi';
  select id into v_tivat_id       from public.cities where slug = 'tivat';
  select id into v_niksic_id      from public.cities where slug = 'niksic';

  -- Dohvati kategorija IDs
  select id into v_it_id          from public.categories where slug = 'it-i-softver';
  select id into v_turizam_id     from public.categories where slug = 'turizam-i-ugostiteljstvo';
  select id into v_gradjevina_id  from public.categories where slug = 'gradjevinarstvo';
  select id into v_zdravstvo_id   from public.categories where slug = 'zdravstvo-i-farmacija';
  select id into v_finansije_id   from public.categories where slug = 'finansije-i-racunovodstvo';
  select id into v_marketing_id   from public.categories where slug = 'marketing-i-oglasavanje';
  select id into v_prodaja_id     from public.categories where slug = 'prodaja-i-maloprodaja';
  select id into v_admin_kat_id   from public.categories where slug = 'administracija';
  select id into v_transport_id   from public.categories where slug = 'transport-i-logistika';
  select id into v_obrazovanje_id from public.categories where slug = 'obrazovanje';

  -- ── FIRME ──────────────────────────────────────────────────────────
  insert into public.companies (owner_id, name, slug, city, industry, description, website, approved) values
    (
      v_admin_id,
      'Adriatic Tech Solutions',
      'adriatic-tech-solutions',
      'Podgorica',
      'IT i softver',
      'Vodeća IT kompanija u Crnoj Gori specijalizovana za razvoj web i mobilnih aplikacija. Radimo sa klijentima iz EU, UK i SAD tržišta. Tim od 45 stručnjaka koji gradi moderne digitalne produkte.',
      'https://adriatictech.me',
      true
    ),
    (
      v_admin_id,
      'Montenegro Resorts Group',
      'montenegro-resorts-group',
      'Budva',
      'Turizam i ugostiteljstvo',
      'Upravljamo sa 4 hotela i 2 resorta duž crnogorske rivijere. Sezonski i stalni poslovi u hotelijerstvu, restoraterstvu i recepciji. Fokus na vrhunski servis i profesionalni razvoj osoblja.',
      'https://montenegroresorts.com',
      true
    ),
    (
      v_admin_id,
      'Gradnja Pro d.o.o.',
      'gradnja-pro',
      'Nikšić',
      'Građevinarstvo',
      'Građevinska kompanija sa 20 godina iskustva u izgradnji stambenih i poslovnih objekata. Aktivni projekti u Podgorici, Nikšiću i primorskom pojasu.',
      null,
      true
    ),
    (
      v_admin_id,
      'MedCenter Podgorica',
      'medcenter-podgorica',
      'Podgorica',
      'Zdravstvo i farmacija',
      'Privatna zdravstvena ustanova koja pruža usluge opšte i specijalističke medicine. Dijagnostika, stomatologija i fizikalna terapija. Tim od 30 ljekara i medicinskih radnika.',
      'https://medcenter.me',
      true
    ),
    (
      v_admin_id,
      'Coastal Marketing Agency',
      'coastal-marketing-agency',
      'Bar',
      'Marketing i oglašavanje',
      'Boutique marketing agencija specijalizovana za digitalni marketing, SEO, social media i brendiranje. Radimo sa lokalnim biznisima i međunarodnim brendovima prisutnim u CG.',
      'https://coastalmarketing.me',
      true
    ),
    (
      v_admin_id,
      'Porto Montenegro Hospitality',
      'porto-montenegro-hospitality',
      'Tivat',
      'Turizam i ugostiteljstvo',
      'Dio Porto Montenegro kompleksa — luksuzno okruženje, međunarodni tim i prilike za karijeru u premium hospitality sektoru. Restoran, bar, recepcija, wellnes i marina servis.',
      'https://portomontenegro.com',
      true
    )
  on conflict (slug) do nothing;

  -- Dohvati company IDs
  select id into v_co1 from public.companies where slug = 'adriatic-tech-solutions';
  select id into v_co2 from public.companies where slug = 'montenegro-resorts-group';
  select id into v_co3 from public.companies where slug = 'gradnja-pro';
  select id into v_co4 from public.companies where slug = 'medcenter-podgorica';
  select id into v_co5 from public.companies where slug = 'coastal-marketing-agency';
  select id into v_co6 from public.companies where slug = 'porto-montenegro-hospitality';

  -- ── OGLASI ─────────────────────────────────────────────────────────
  insert into public.jobs (
    company_id, category_id, city_id,
    title, slug, description, contract_type, salary_text,
    deadline, status, featured
  ) values

  -- Adriatic Tech Solutions (IT)
  (
    v_co1, v_it_id, v_podgorica_id,
    'Senior Full-Stack Developer (React/Node)',
    'senior-full-stack-developer-react-node-' || extract(epoch from now())::bigint,
    'Tražimo iskusnog Full-Stack developera koji će raditi na razvoju SaaS platformi za klijente iz EU i SAD. Korišćenje najnovijih tehnologija: React 19, Next.js 15, Node.js, PostgreSQL, AWS.

Šta radite:
- Razvijate nove funkcionalnosti na frontend i backend
- Code review i mentoring junior developera
- Arhitekturne odluke u saradnji sa Tech Leadom
- Direktna komunikacija sa klijentima (engleski obavezan)

Nudimo:
- Remote/hybrid model rada
- Oprema po izboru
- Konferencije i edukacija
- Tim od 12 developera',
    'Stalni radni odnos',
    '1.800 – 2.500 €',
    current_date + interval '45 days',
    'active',
    true  -- ISTAKNUTO
  ),
  (
    v_co1, v_it_id, v_podgorica_id,
    'Junior Frontend Developer',
    'junior-frontend-developer-' || (extract(epoch from now())::bigint + 1),
    'Odlična prilika za početak karijere u IT sektoru. Radićete na React projektima uz mentorstvo senior tima. Nema potrebe za komercijalnim iskustvom — važni su znanje i entuzijazam.

Šta tražimo:
- Osnovno znanje HTML, CSS, JavaScript
- Poznavanje React osnova (hooks, state)
- Git workflow
- Komunikativnost i želja za učenjem

Šta nudimo:
- Plaćena obuka prvih 3 mjeseca
- Mentorski program
- Fleksibilno radno vrijeme
- Mogućnost remote rada',
    'Stalni radni odnos',
    '700 – 950 €',
    current_date + interval '30 days',
    'active',
    false
  ),
  (
    v_co1, v_it_id, v_podgorica_id,
    'QA Engineer / Tester',
    'qa-engineer-tester-' || (extract(epoch from now())::bigint + 2),
    'Tražimo QA inženjera koji će osigurati kvalitet naših web aplikacija. Kombinirano ručno i automatizovano testiranje.

Odgovornosti:
- Pisanje i izvršavanje test scenarija
- Automatizovano testiranje (Playwright/Cypress)
- Bug reporting i tracking
- Rad u Agile timu

Iskustvo: min. 1 godina u QA poziciji.',
    'Stalni radni odnos',
    '900 – 1.200 €',
    current_date + interval '35 days',
    'active',
    false
  ),

  -- Montenegro Resorts Group (Turizam)
  (
    v_co2, v_turizam_id, v_budva_id,
    'Hotel Menadžer — Sezona 2026',
    'hotel-menadzder-sezona-2026-' || (extract(epoch from now())::bigint + 3),
    'Tražimo iskusnog hotel menadžera za vođenje 4-zvjezdičnog hotela u Budvi tokom ljetnje sezone. Pozicija podrazumijeva potpunu odgovornost za operacije hotela kapaciteta 180 soba.

Uslovi:
- Min. 3 godine iskustva na rukovodećoj poziciji u hotelijerstvu
- Poznavanje engleskog (drugi jezik prednost)
- Iskustvo sa property management sistemima (Opera, Protel ili slično)
- Dostupnost od 1. maja do 31. oktobra

Nudimo:
- Atraktivna plata + bonus na performanse
- Smještaj obezbijeden
- Referentno pismo po završetku sezone',
    'Ugovor na određeno (sezona)',
    '1.500 – 2.000 €',
    current_date + interval '60 days',
    'active',
    true  -- ISTAKNUTO
  ),
  (
    v_co2, v_turizam_id, v_budva_id,
    'Konobar/ica — Restoran na plaži',
    'konobar-restoran-na-plazi-' || (extract(epoch from now())::bigint + 4),
    'Zapošljavamo konobara/icu za rad u a la carte restoranu direktno na plaži. Radno mjesto sa pogledom na more i odličnom atmosferom.

Uslovi:
- Iskustvo u ugostiteljstvu min. 1 sezona
- Komunikativan/a i spreman/a za rad u timu
- Poznavanje engleskog — prednost
- Fizička kondicija za intenzivan rad

Radno vrijeme: smjenski rad, vikendi obavezni.
Sezonski ugovor: maj — oktobar.',
    'Ugovor na određeno (sezona)',
    '650 – 800 € + napojnice',
    current_date + interval '45 days',
    'active',
    false
  ),
  (
    v_co2, v_admin_kat_id, v_budva_id,
    'Recepcioner/ka — Hotel 4*',
    'recepcioner-hotel-4zvjezdice-' || (extract(epoch from now())::bigint + 5),
    'Tražimo recepcionera/ku za front desk u hotelu sa 4 zvjezdice u centru Budve.

Opis posla:
- Check-in / check-out gostiju
- Upravljanje rezervacijama
- Komunikacija sa gostima (lično, telefon, email)
- Koordinacija sa domaćinstvom i restoranom

Uslovi:
- Engleski napredni nivo (obavezan)
- Poznavanje još jednog stranog jezika (prednost)
- Uredna pojava i profesionalan nastup
- Iskustvo na recepciji min. 1 godina',
    'Ugovor na određeno (sezona)',
    '700 – 850 €',
    current_date + interval '30 days',
    'active',
    false
  ),

  -- Gradnja Pro (Građevinarstvo)
  (
    v_co3, v_gradjevina_id, v_niksic_id,
    'Građevinski Inženjer — Projektni Menadžer',
    'gradjevinski-inzenjer-projektni-menadzder-' || (extract(epoch from now())::bigint + 6),
    'Tražimo diplomiranog građevinskog inženjera za poziciju projektnog menadžera na izgradnji stambenih objekata u Podgorici i Nikšiću.

Zadaci:
- Planiranje i koordinacija faza gradnje
- Upravljanje timovima radnika i podizvođača
- Kontrola kvaliteta i troškova
- Koordinacija sa investitorima i nadzornim organima
- Izrada izvještaja o napretku projekta

Uslovi:
- Diploma građevinskog fakulteta
- Min. 3 godine iskustva na sličnoj poziciji
- Poznavanje AutoCAD-a i MS Project-a
- Vozačka dozvola B kategorije',
    'Stalni radni odnos',
    '1.200 – 1.600 €',
    current_date + interval '40 days',
    'active',
    false
  ),
  (
    v_co3, v_gradjevina_id, v_podgorica_id,
    'Zidar — Iskusni radnik',
    'zidar-iskusni-radnik-' || (extract(epoch from now())::bigint + 7),
    'Primamo u stalni radni odnos iskusnog zidara za rad na stambenoj izgradnji u Podgorici.

Traži se:
- Min. 5 godina iskustva u zidanju
- Poznavanje rada sa različitim materijalima
- Fizička sposobnost
- Tačnost i odgovornost

Radno vrijeme: 7-15h, pon-sub.
Prevoz organizovan iz Nikšića.',
    'Stalni radni odnos',
    '700 – 900 €',
    current_date + interval '20 days',
    'active',
    false
  ),

  -- MedCenter Podgorica
  (
    v_co4, v_zdravstvo_id, v_podgorica_id,
    'Doktor opšte medicine',
    'doktor-opste-medicine-' || (extract(epoch from now())::bigint + 8),
    'Privatna zdravstvena ustanova traži ljekara opšte medicine za puno radno vrijeme.

Uslovi:
- Diploma Medicinskog fakulteta
- Položen stručni ispit
- Licenca za rad (ili u postupku dobijanja)
- Komunikativnost i empatija prema pacijentima

Nudimo:
- Moderna ordinacija i oprema
- Administrativna podrška (medicinska sestra)
- Mogućnost specijalizacije
- Atraktivna plata po dogovoru',
    'Stalni radni odnos',
    'Po dogovoru',
    current_date + interval '60 days',
    'active',
    true  -- ISTAKNUTO
  ),
  (
    v_co4, v_zdravstvo_id, v_podgorica_id,
    'Medicinska sestra / tehničar',
    'medicinska-sestra-tehnicar-' || (extract(epoch from now())::bigint + 9),
    'Tražimo medicinsku sestru/tehničara za rad u ambulanti opšte medicine.

Opis posla:
- Asistencija ljekaru tokom pregleda
- Uzimanje uzoraka (krv, bris)
- Urednost medicinske dokumentacije
- Komunikacija sa pacijentima

Uslovi:
- SSS ili VSS medicinska škola / fakultet
- Licenca za rad
- Iskustvo min. 1 godina',
    'Stalni radni odnos',
    '600 – 750 €',
    current_date + interval '30 days',
    'active',
    false
  ),

  -- Coastal Marketing Agency
  (
    v_co5, v_marketing_id, v_bar_id,
    'Digital Marketing Specialist',
    'digital-marketing-specialist-' || (extract(epoch from now())::bigint + 10),
    'Tražimo iskusnog digital marketing specijalista koji će voditi kampanje za naše klijente iz turizma, FMCG i e-commerce sektora.

Odgovornosti:
- Planiranje i vođenje Google Ads i Meta Ads kampanja
- SEO optimizacija i content strategija
- Email marketing i automatizacija
- Analiza podataka i reporting klijentima
- Koordinacija sa dizajn timom

Znanje:
- Google Ads, Meta Business Suite (certifikati prednost)
- Google Analytics 4
- Osnove HTML/CSS (prednost)
- Engleski napredni nivo',
    'Stalni radni odnos',
    '900 – 1.300 €',
    current_date + interval '35 days',
    'active',
    false
  ),
  (
    v_co5, v_marketing_id, v_bar_id,
    'Grafički dizajner / Visual Creator',
    'graficki-dizajner-visual-creator-' || (extract(epoch from now())::bigint + 11),
    'Agencija traži kreativnog dizajnera koji razumije digitalni prostor i zna da komunicira brendove vizualno.

Šta ćete raditi:
- Dizajn za social media (statičan i motion)
- Brand identity materijali
- Printani materijali (brošure, plakati)
- UI/UX wireframe suport (prednost)

Alati: Adobe Creative Suite obavezan, Figma prednost.

Portfolio je obavezan dio prijave — pošaljite link ili PDF.',
    'Stalni / freelance po dogovoru',
    '700 – 1.000 €',
    current_date + interval '25 days',
    'active',
    false
  ),

  -- Porto Montenegro Hospitality
  (
    v_co6, v_turizam_id, v_tivat_id,
    'F&B Manager — Luksuzni Resort',
    'fb-manager-luksuzni-resort-' || (extract(epoch from now())::bigint + 12),
    'Porto Montenegro traži iskusnog Food & Beverage menadžera za vođenje restorana, bara i catering operacija u prestižnom marinom okruženju.

Odgovornosti:
- Vođenje F&B tima (30+ osoba)
- Kreiranje i ažuriranje menija
- Upravljanje troškovima i nabavkom
- Osiguranje standarda kvaliteta i iskustva gosta
- Saradnja sa međunarodnim brendovima prisutnim u kompleksu

Profil:
- Min. 5 godina iskustva u luksuznom F&B segmentu
- Engleski fluent (obavezan), drugi jezik prednost
- Iskustvo u multi-outlet operacijama',
    'Stalni radni odnos',
    '1.600 – 2.200 €',
    current_date + interval '50 days',
    'active',
    true  -- ISTAKNUTO
  ),
  (
    v_co6, v_turizam_id, v_tivat_id,
    'Barman/ka — Sunset Bar',
    'barman-sunset-bar-' || (extract(epoch from now())::bigint + 13),
    'Tražimo iskusnog barmena/ku za Sunset Bar u Porto Montenegro kompleksu.

Cocktail bar sa pogledom na marinu i luksuznom klijentelom.

Uslovi:
- Min. 2 sezone iskustva u bar sektoru
- Poznavanje klasičnih i savremenih koktela
- Engleski komunikativan (obavezan)
- Uredna pojava i odlične komunikacijske vještine

Nudimo: Konkurentna plata, napojnice, međunarodni tim.',
    'Ugovor na određeno (sezona)',
    '750 – 950 € + napojnice',
    current_date + interval '40 days',
    'active',
    false
  ),
  (
    v_co6, v_admin_kat_id, v_tivat_id,
    'Marina Assistant / Customer Relations',
    'marina-assistant-customer-relations-' || (extract(epoch from now())::bigint + 14),
    'Rad u marini Porto Montenegro na recepciji i korisničkoj podršci za vlasnike plovila i goste.

Posao:
- Prijem i asistencija vlasnika jahti
- Koordinacija marina servisa
- Upravljanje rezervacijama vezova
- Komunikacija sa posadama (engleski/talijanski)

Uslovi:
- Engleski — napredni nivo (obavezan)
- Talijanski ili francuski — prednost
- Uredna pojava, profesionalnost
- Iskustvo u turizmu ili sličnoj poziciji',
    'Stalni radni odnos',
    '800 – 1.000 €',
    current_date + interval '30 days',
    'active',
    false
  )
  on conflict (slug) do nothing;

  raise notice 'Seed data uspješno ubačen! Firme: 6, Oglasi: 15 (od toga 4 istaknuta).';

end $$;


-- ──────────────────────────────────────────────────────────────────────
-- 5. VERIFIKACIJA — provjeri šta je ubačeno
-- ──────────────────────────────────────────────────────────────────────
select
  'Gradovi'     as tabela, count(*) as broj from public.cities
union all select
  'Kategorije',               count(*) from public.categories
union all select
  'Planovi',                  count(*) from public.plans
union all select
  'Firme (odobrene)',         count(*) from public.companies where approved = true
union all select
  'Oglasi (aktivni)',         count(*) from public.jobs where status = 'active'
union all select
  'Istaknuti oglasi',         count(*) from public.jobs where featured = true and status = 'active';
