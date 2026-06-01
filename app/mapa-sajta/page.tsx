import type { Metadata } from "next";
import { Card, PageLabel } from "@/components/ui";

export const metadata: Metadata = {
  title: "Mapa sajta",
  description: "Pregled svih dijelova platforme imaposla.me — poslovi, firme, kandidati i upravljanje.",
  robots: { index: false, follow: true }, // Sitemap page itself doesn't need indexing
};

export default function SitemapPage() {
  return (
    <section className="live-info-page">
      <PageLabel>imaposla.me</PageLabel>
      <h1>Mapa sajta</h1>
      <p className="lead">Pregled najvažnijih djelova platforme i kome su namijenjeni.</p>
      <div className="grid two">
        <Card title="Javno" text="Početna, oglasi, gradovi, kategorije, firme, za firme, prijava i registracija." />
        <Card title="Kandidat" text="Pregled kandidata, biografija, moje prijave i podešavanja profila." />
        <Card title="Firma" text="Pregled firme, oglasi, novi oglas, selekcija prijava, kandidati, pretplata i baneri." />
        <Card title="Upravljanje" text="Skriveni dio za provjeru korisnika, oglasa, uplata i javnih prikaza." />
      </div>
    </section>
  );
}
