import type { Metadata } from "next";
import { PageLabel } from "@/components/ui";

export const metadata: Metadata = {
  title: "Politika privatnosti",
  description: "Politika privatnosti platforme imaposla.me — kako prikupljamo i koristimo podatke."
};

export default function PrivacyPage() {
  return (
    <section className="live-info-page" style={{ maxWidth: 780 }}>
      <PageLabel>Pravno</PageLabel>
      <h1>Politika privatnosti</h1>
      <p className="lead">Posljednja izmjena: maj 2026. Platforma imaposla.me obrađuje lične podatke isključivo u svrhu posredovanja između kandidata i poslodavaca.</p>

      <div className="panel" style={{ marginTop: 24 }}>
        <h2 style={{ fontSize: 22, marginBottom: 12 }}>Koji podaci se prikupljaju</h2>
        <p style={{ color: "var(--muted)", lineHeight: 1.75, marginBottom: 12 }}>
          <strong>Kandidati:</strong> e-pošta, ime i prezime, grad, telefon, radno iskustvo, vještine i dostupnost unijeti kroz CV builder. Profilna slika (opciona). Fajlovi životopisa se ne čuvaju.
        </p>
        <p style={{ color: "var(--muted)", lineHeight: 1.75, marginBottom: 12 }}>
          <strong>Firme:</strong> naziv firme, grad, djelatnost, opis, logo, website i podaci o planu. Podaci o uplati (referentni broj, iznos, dokaz uplate).
        </p>
        <p style={{ color: "var(--muted)", lineHeight: 1.75 }}>
          <strong>Prijave:</strong> propratni tekst koji kandidat unese uz prijavu. Firma vidi prijave isključivo za svoje oglase.
        </p>
      </div>

      <div className="panel" style={{ marginTop: 16 }}>
        <h2 style={{ fontSize: 22, marginBottom: 12 }}>Kako se podaci koriste</h2>
        <p style={{ color: "var(--muted)", lineHeight: 1.75, marginBottom: 12 }}>Podaci se koriste isključivo za funkcionisanje platforme: prikaz profila, slanje prijava, selekciju kandidata i obradu planova. Podaci se ne prodaju trećim stranama.</p>
        <p style={{ color: "var(--muted)", lineHeight: 1.75 }}>Transakcione e-poruke (potvrda naloga, reset lozinke, obavještenja) šalju se putem Supabase Auth servisa. Platforma ne šalje marketinške e-poruke bez pristanka.</p>
      </div>

      <div className="panel" style={{ marginTop: 16 }}>
        <h2 style={{ fontSize: 22, marginBottom: 12 }}>Prava korisnika</h2>
        <p style={{ color: "var(--muted)", lineHeight: 1.75 }}>
          Korisnik ima pravo uvida u podatke koji se odnose na njega, pravo na ispravku i pravo na brisanje naloga. Zahtjev se šalje na kontakt e-poštu platforme. Podaci koji su potrebni za aktivne ugovorne odnose (npr. neizmirene narudžbe) ne mogu se obrisati do okončanja odnosa.
        </p>
      </div>

      <div className="panel" style={{ marginTop: 16 }}>
        <h2 style={{ fontSize: 22, marginBottom: 12 }}>Kolačići i sesije</h2>
        <p style={{ color: "var(--muted)", lineHeight: 1.75 }}>
          Platforma koristi kolačiće isključivo za autentifikaciju korisnika (Supabase sesijski kolačić). Ne koriste se marketinški ni analitički kolačići trećih strana.
        </p>
      </div>
    </section>
  );
}

