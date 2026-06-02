import type { Metadata } from "next";
import Link from "next/link";
import { JobCardClean } from "@/components/job-card-clean";
import { PremiumEmployers } from "@/components/premium-employers";
import { HeroBannerCarousel } from "@/components/hero-banner-carousel";
import { Button } from "@/components/ui";
import { BannerSlot } from "@/components/banner-slot";
import { getLookups, getHomepageData, getCompanies, getPopularTags } from "@/lib/queries/public";
import { getActiveBanners } from "@/lib/queries/banners";
import type { JobWithPromotion } from "@/types/domain";

export const metadata: Metadata = {
  title: "imaposla.me - Poslovi u Crnoj Gori",
  description: "Pronađi posao ili objavi oglas u Crnoj Gori. Kandidati, firme i oglasi na jednom mjestu.",
};

export const revalidate = 300;

export default async function HomePage() {
  const [homepageData, heroBanners, lookups, popularTags] = await Promise.all([
    getHomepageData(),
    getActiveBanners("homepage_hero", "all", 5),
    getLookups(),
    getPopularTags(),
  ]);

  const { paidTopJobs, featuredJobs, regularJobs, recommendedCompanies } = homepageData;
  const fallbackCompaniesRaw = recommendedCompanies.length === 0 ? await getCompanies(8) : [];
  const fallbackCompanies = fallbackCompaniesRaw as unknown as typeof recommendedCompanies;

  const allJobs: JobWithPromotion[] = [...paidTopJobs, ...featuredJobs, ...regularJobs];
  const displayCompanies = recommendedCompanies.length > 0 ? recommendedCompanies : fallbackCompanies;

  return (
    <section className="live-home home-redesign">

      {/* ── HERO ── */}
      <div className="live-hero home-hero-redesign">
        <span className="page-label">Pravi ljudi. Prave prilike.</span>
        <h1>Pronađi posao ili zaposli prave ljude.</h1>
        <p>
          Kandidati brzo dolaze do relevantnih oglasa. Poslodavci objavljuju posao,
          dobijaju prijave i vode selekciju na jednom mjestu.
        </p>

        {/* Intent switch — tri ravnopravne namjere */}
        <div className="home-intent-switch home-intent-switch--three" aria-label="Izaberi šta želiš da uradiš">
          <Link href="/oglasi" className="home-intent-card home-intent-card--candidate">
            <span>Tražim posao</span>
            <strong>Pretraži oglase, napravi biografiju i prati prijave.</strong>
          </Link>
          <Link href="/registracija?role=candidate&intent=worker" className="home-intent-card home-intent-card--worker">
            <span>Nudim brze usluge</span>
            <strong>Konobar, moler, hostesa, šanker, pomoćni radnik? Napravi profil da te firme mogu kontaktirati.</strong>
          </Link>
          <Link href="/registracija?role=company" className="home-intent-card home-intent-card--employer">
            <span>Zapošljavam</span>
            <strong>Objavi oglas ili pronađi radnika za kratak angažman.</strong>
          </Link>
        </div>

        {/* Search */}
        <form className="live-search home-main-search" action="/oglasi">
          <input
            placeholder="Naziv posla, firma ili vještina"
            aria-label="Naziv posla, firma ili vještina"
            name="q"
          />
          <select name="city" aria-label="Grad">
            <option value="">Svi gradovi</option>
            {lookups.cities.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
          </select>
          <select name="category" aria-label="Kategorija">
            <option value="">Sve kategorije</option>
            {lookups.categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
          </select>
          <button type="submit">Pretraži</button>
        </form>

        {/* Popular tags */}
        <div className="quick-tags">
          <span className="quick-tags__label">Popularno:</span>
          {popularTags.map(p => (
            <Link key={p.q} href={`/oglasi?q=${encodeURIComponent(p.q)}`} className="quick-tag">
              {p.label}
            </Link>
          ))}
        </div>
      </div>

      {/* ── BRZI POSLOVI PROMO ── */}
      <Link href="/brzi-poslovi" className="bp-promo">
        <div className="bp-promo__icon" aria-hidden>⚡</div>
        <div className="bp-promo__text">
          <strong>Brzi poslovi — angažuj odmah</strong>
          <span>Konobari, moleri, hostese i pomoćni radnici dostupni za kratke angažmane.</span>
        </div>
        <span className="bp-promo__arrow" aria-hidden>→</span>
      </Link>

      {/* ── PREMIUM POSLODAVCI ── */}
      {displayCompanies.length > 0 && (
        <section className="premium-employers-section" aria-labelledby="premium-employers-title">
          <div className="live-section-head">
            <div>
              <span className="kicker">Premium sekcija</span>
              <h2 id="premium-employers-title">Istaknuti poslodavci</h2>
              <p>Firme koje aktivno traže ljude i imaju javne profile na platformi.</p>
            </div>
            <Link className="btn ghost sm" href="/firme">Svi poslodavci</Link>
          </div>
          <PremiumEmployers companies={displayCompanies} />
        </section>
      )}

      {/* ── HERO CAROUSEL ── */}
      {heroBanners.length > 0 && (
        <HeroBannerCarousel banners={heroBanners} autoPlayMs={6000} />
      )}

      <BannerSlot placement="homepage_top" />

      {/* ── NAJNOVIJI OGLASI ── */}
      <section>
        <div className="live-section-head">
          <div>
            <span className="kicker">Aktivno</span>
            <h2>Najnoviji oglasi</h2>
            <p>Prikazuju se samo oglasi koji su odobreni i aktivni.</p>
          </div>
          <Link className="btn ghost sm" href="/oglasi">Svi oglasi</Link>
        </div>

        <div className="job-list two-col">
          {allJobs.slice(0, 8).map((job: JobWithPromotion) => (
            <JobCardClean key={job.id} job={job} />
          ))}
        </div>

        {allJobs.length === 0 && (
          <div className="notice-card" style={{ textAlign: "center", padding: 32 }}>
            <strong>Trenutno nema aktivnih oglasa</strong>
            <p>Novi oglasi se objavljuju svakodnevno. Registruj se i prati novosti.</p>
            <div className="actions" style={{ justifyContent: "center", marginTop: 12 }}>
              <Button href="/registracija" tone="blue">Registruj se →</Button>
              <Button href="/oglasi">Pretraži oglase</Button>
            </div>
          </div>
        )}

        {allJobs.length > 0 && (
          <div className="home-more-jobs">
            <Button href="/oglasi" tone="blue">Pogledaj sve oglase</Button>
          </div>
        )}
      </section>

      {/* ── CTA PATHS ── */}
      <div className="live-paths live-paths--three home-paths-final">
        <Link className="live-path" href="/oglasi">
          <span>Tražim posao</span>
          <h2>Tražim posao</h2>
          <p>Otvori oglas, pročitaj uslove, dopuni biografiju i pošalji prijavu bez komplikacija.</p>
          <strong>Otvori oglase →</strong>
        </Link>
        <Link className="live-path" href="/registracija?role=candidate&intent=worker">
          <span>Brze usluge</span>
          <h2>Nudim brze usluge</h2>
          <p>Napravi profil sa svojim uslugama (konobar, moler, hostesa…) da te firme i ljudi kontaktiraju za kratke angažmane.</p>
          <strong>Napravi profil →</strong>
        </Link>
        <Link className="live-path" href="/registracija?role=company">
          <span>Firma</span>
          <h2>Zapošljavam</h2>
          <p>Objavi oglas ili pronađi radnika za kratak angažman i vodi kandidate kroz selekciju.</p>
          <strong>Kreni kao firma →</strong>
        </Link>
      </div>

      <BannerSlot placement="homepage_bottom" />
    </section>
  );
}
