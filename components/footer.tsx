import Link from "next/link";
import Image from "next/image";
import { getLookups } from "@/lib/queries/public";
import { BannerSlot } from "@/components/banner-slot";

export async function Footer() {
  const { cities, categories } = await getLookups();

  // Top 6 gradova i kategorija sa fallback ako baza prazna
  const topCities = cities.slice(0, 6);
  const topCategories = categories.slice(0, 6);

  return (
    <footer className="footer">
      {/* Footer banner — iznad footer sadržaja */}
      <BannerSlot placement="footer_banner" className="footer-banner-slot" />
      <div className="wrap foot-grid">
        <div>
          <Link className="brand footer-brand" href="/">
            <Image src="/logo-mark-light.png" alt="" width={30} height={37} className="footer-logo-img" />
            <span>imaposla<span style={{ color: "var(--brand-red)" }}>.me</span></span>
          </Link>
          <p>Platforma za oglase, prijave i jednostavnije zapošljavanje u Crnoj Gori.</p>
          <p style={{ marginTop: 12, fontSize: 12 }}>© 2026 imaposla.me</p>
        </div>
        <div>
          <h4>Gradovi</h4>
          {topCities.length
            ? topCities.map(c => <Link key={c.id} href={`/gradovi/${c.slug || encodeURIComponent(c.name.toLowerCase())}`}>{c.name}</Link>)
            : <Link href="/gradovi">Pregled gradova</Link>
          }
        </div>
        <div>
          <h4>Kategorije</h4>
          {topCategories.length
            ? topCategories.map(c => <Link key={c.id} href={`/kategorije/${c.slug || encodeURIComponent(c.name.toLowerCase())}`}>{c.name}</Link>)
            : <Link href="/kategorije">Pregled kategorija</Link>
          }
        </div>
        <div>
          <h4>Firma</h4>
          <Link href="/za-firme">Za firme</Link>
          <Link href="/registracija?role=company">Registruj firmu</Link>
          <Link href="/login">Prijava</Link>
          <h4 style={{ marginTop: 16 }}>Pravno</h4>
          <Link href="/privatnost">Privatnost</Link>
          <Link href="/uslovi-koriscenja">Uslovi korišćenja</Link>
          <Link href="/mapa-sajta">Mapa sajta</Link>
        </div>
      </div>
    </footer>
  );
}
