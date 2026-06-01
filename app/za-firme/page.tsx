import type { Metadata } from "next";
import { Button, Card, PageLabel } from "@/components/ui";

export const metadata: Metadata = {
  title: "Za firme — objavi oglas",
  description: "Objavi oglas za posao u Crnoj Gori. Firma dobija profil, ATS selekciju kandidata i direktan kontakt. Ručna uplata, bez pretplate unaprijed."
};

export default function ForCompaniesPage() {
  return (
    <>
      <section className="live-info-page">
        <PageLabel>Za firme</PageLabel>
        <h1>Pronađi pravog kandidata, brže.</h1>
        <p className="lead">
          Firma dobija javni profil, oglase, ATS selekciju prijava i direktan kontakt sa kandidatima.
          Ručna uplata bankovnim transferom — bez pretplate unaprijed.
        </p>
        <div className="actions">
          <Button href="/registracija?role=company" tone="blue">Kreiraj nalog firme</Button>
          <Button href="/login" tone="ghost">Već imam nalog</Button>
        </div>
      </section>

      {/* How it works */}
      <div className="grid three with-top-space">
        <Card title="1. Profil firme" text="Upiši naziv, grad, djelatnost i opis. Dodaj logo. Profil se prikazuje javno nakon administratorske provjere." />
        <Card title="2. Objavi oglas" text="Unesi poziciju, grad, kategoriju, platu i opis. Oglas ide na kratki pregled, pa je živ na platformi." />
        <Card title="3. Vodi selekciju" text="Prijave vodiš kroz faze: Nova → Pregled → Razgovor → Uži izbor → Ponuda → Zaposlen ili Odbijeno." />
      </div>

      {/* Features */}
      <div className="grid two with-top-space">
        <Card title="📋 ATS — praćenje prijava" text="Sve prijave na jednom mjestu. Pomjeri kandidata kroz fazu, dodaj komentar tima, označi prioritete. Radi na mobitelu i desktopu." />
        <Card title="📬 Direktan kontakt" text="Email i telefon kandidata su vidljivi odmah nakon prijave. Nema posrednika, nema čekanja." />
        <Card title="🔍 Pretraga kandidata" text="Kandidati popunjavaju biografiju sa iskustvom, vještinama i dostupnošću — sve na jednom profilu." />
        <Card title="🔔 Obavještenja" text="Sistem te obavijesti kada stigne nova prijava. Prati status putem notifikacija ili emaila." />
      </div>

      {/* Pricing hint */}
      <div className="panel with-top-space" style={{ maxWidth: 640 }}>
        <span className="kicker">Cijene</span>
        <h2 style={{ fontSize: 28, marginBottom: 8 }}>Planovi po dogovoru</h2>
        <p style={{ color: "var(--muted)", lineHeight: 1.65, marginBottom: 16 }}>
          Osnovna registracija je besplatna. Aktivni oglasi i napredne funkcije dolaze u okviru plana.
          Uplata putem bankovnog transfera — administrator aktivira plan ručno.
        </p>
        <Button href="/registracija?role=company" tone="blue">Registruj firmu besplatno →</Button>
      </div>
    </>
  );
}

