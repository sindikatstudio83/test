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
  description: "Pronadji posao ili objavi oglas u Crnoj Gori. Kandidati, firme i oglasi na jednom mjestu.",
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
    <section className="nh-home">
      <div className="nh-creative-hero">
        <div className="nh-container nh-hero-grid">
          <div className="nh-hero-copy">
            <span className="nh-pill">Pravi ljudi. Prave prilike.</span>
            <h1>Pronadji posao ili zaposli prave ljude.</h1>
            <p>Kandidati brzo dolaze do relevantnih oglasa. Poslodavci objavljuju posao, dobijaju prijave i vode selekciju na jednom mjestu.</p>
            <form className="nh-hero-search" action="/oglasi">
              <input name="q" placeholder="Naziv posla, firma ili vjestina" aria-label="Pretraga" />
              <select name="city" aria-label="Grad">
                <option value="">Svi gradovi</option>
                {lookups.cities.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
              </select>
              <button type="submit">Pretrazi</button>
            </form>
            <div className="nh-tags">
              <span>Popularno</span>
              {popularTags.slice(0, 5).map((p) => (
                <Link key={p.q} href={`/oglasi?q=${encodeURIComponent(p.q)}`}>{p.label}</Link>
              ))}
            </div>
          </div>

          <div className="nh-hero-art" aria-hidden="true">
            <div className="nh-hero-card nh-hero-card--top">
              <strong>{allJobs.length || "100+"}</strong>
              <span>aktivnih oglasa</span>
            </div>
            <div className="nh-hero-person"><span>imaposla.me</span></div>
            <div className="nh-hero-card nh-hero-card--bottom">
              <strong>{displayCompanies.length || "50+"}</strong>
              <span>firmi i klijenata</span>
            </div>
          </div>
        </div>
      </div>

      <Link href="/brzi-poslovi" className="nh-container nh-service-strip">
        <div className="nh-service-icon" aria-hidden>!</div>
        <div>
          <strong>Brzi poslovi - angazuj odmah</strong>
          <span>Konobari, moleri, hostese i pomocni radnici dostupni za kratke angazmane.</span>
        </div>
        <b>Otvori</b>
      </Link>

      {displayCompanies.length > 0 && (
        <section className="nh-section">
          <div className="nh-container nh-section-head">
            <div>
              <span className="nh-pill">Premium sekcija</span>
              <h2>Istaknuti poslodavci</h2>
              <p>Firme koje aktivno traze ljude i imaju javne profile na platformi.</p>
            </div>
            <Link className="nh-outline-btn" href="/firme">Svi poslodavci</Link>
          </div>
          <div className="nh-container">
            <PremiumEmployers companies={displayCompanies} />
          </div>
        </section>
      )}

      {heroBanners.length > 0 && (
        <div className="nh-container"><HeroBannerCarousel banners={heroBanners} autoPlayMs={6000} /></div>
      )}

      <div className="nh-container"><BannerSlot placement="homepage_top" /></div>

      <section className="nh-section">
        <div className="nh-container nh-section-head">
          <div>
            <span className="nh-pill">Aktivno</span>
            <h2>Najnoviji oglasi</h2>
            <p>Prikazuju se samo oglasi koji su odobreni i aktivni.</p>
          </div>
          <Link className="nh-outline-btn" href="/oglasi">Svi oglasi</Link>
        </div>

        <div className="nh-container nh-job-grid">
          {allJobs.slice(0, 8).map((job) => <JobCardClean key={job.id} job={job} />)}
        </div>

        {allJobs.length === 0 && (
          <div className="nh-container">
            <div className="nh-empty">
              <strong>Trenutno nema aktivnih oglasa</strong>
              <p>Novi oglasi se objavljuju svakodnevno. Registruj se i prati novosti.</p>
              <div className="actions">
                <Button href="/registracija" tone="blue">Registruj se</Button>
                <Button href="/oglasi">Pretrazi oglase</Button>
              </div>
            </div>
          </div>
        )}

        {allJobs.length > 0 && (
          <div className="nh-more">
            <Button href="/oglasi" tone="blue">Pogledaj sve oglase</Button>
          </div>
        )}
      </section>

      <div className="nh-container nh-intent-grid">
        <Link className="nh-intent-card" href="/oglasi">
          <span>Trazim posao</span>
          <h2>Trazim posao</h2>
          <p>Otvori oglas, procitaj uslove, dopuni biografiju i posalji prijavu bez komplikacija.</p>
          <strong>Otvori oglase</strong>
        </Link>
        <Link className="nh-intent-card" href="/registracija?role=candidate&intent=worker">
          <span>Brze usluge</span>
          <h2>Nudim brze usluge</h2>
          <p>Napravi profil sa svojim uslugama da te firme i ljudi kontaktiraju za kratke angazmane.</p>
          <strong>Napravi profil</strong>
        </Link>
        <Link className="nh-intent-card" href="/registracija?role=company">
          <span>Firma</span>
          <h2>Zaposljavam</h2>
          <p>Objavi oglas ili pronadji radnika za kratak angazman i vodi kandidate kroz selekciju.</p>
          <strong>Kreni kao firma</strong>
        </Link>
      </div>

      <div className="nh-container"><BannerSlot placement="homepage_bottom" /></div>
    </section>
  );
}
