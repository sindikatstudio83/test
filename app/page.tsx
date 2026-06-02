import type { Metadata } from "next";
import Link from "next/link";
import { Avatar } from "@/components/avatar";
import { CompanyCard } from "@/components/company-card";
import { JobCardClean } from "@/components/job-card-clean";
import { getHomepageData, getLookups } from "@/lib/queries/public";

export const metadata: Metadata = {
  title: "imaposla.me - Poslovi u Crnoj Gori",
  description: "Pronadji posao, kandidata ili radnika za brzi angazman u Crnoj Gori.",
};

export const revalidate = 300;

const homeImg = (name: string) => `/nexthire-home/${name}`;

export default async function HomePage() {
  const [homepageData, lookups] = await Promise.all([
    getHomepageData(),
    getLookups(),
  ]);

  const jobs = [
    ...homepageData.paidTopJobs,
    ...homepageData.featuredJobs,
    ...homepageData.regularJobs,
  ].slice(0, 6);
  const companies = homepageData.recommendedCompanies.slice(0, 6);
  const categories = lookups.categories.slice(0, 8);

  return (
    <main className="nx-home">
      <section className="hero">
        <div className="hero-wrap">
          <div className="hero-left">
            <h1 className="hero-h1">Pronađi <strong>Posao Iz Snova</strong> Danas!</h1>
            <p className="hero-sub">Istraži otvorene pozicije, brze angažmane i profile firmi na jednom mjestu.</p>
            <form className="hero-search-box" action="/oglasi">
              <input className="hero-input" name="q" placeholder="Naziv posla ili firma..." />
              <select className="hero-select" name="city" defaultValue="">
                <option value="">Odaberi grad</option>
                {lookups.cities.map((city) => <option value={city.name} key={city.id}>{city.name}</option>)}
              </select>
              <select className="hero-select" name="category" defaultValue="">
                <option value="">Kategorija</option>
                {lookups.categories.map((category) => <option value={category.name} key={category.id}>{category.name}</option>)}
              </select>
              <button className="btn-search" type="submit">Pretraži</button>
            </form>
            <div className="hero-stats">
              <div className="h-stat"><div className="h-stat-icon">💼</div><strong>5.000+</strong><span>Oglasa</span></div>
              <div className="h-stat"><div className="h-stat-icon">👥</div><strong>1.200+</strong><span>Kandidata</span></div>
              <div className="h-stat"><div className="h-stat-icon">🏢</div><strong>300+</strong><span>Firmi</span></div>
            </div>
          </div>
          <div className="hero-right">
            <div className="hero-img-box nx-photo-box">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img className="nx-photo" src={homeImg("heroImg1.webp")} alt="Kandidatkinja spremna za posao" />
            </div>
            <div className="hero-stamp"><div className="stamp-circle"><div className="stamp-inner"><div className="stamp-text">imaposla.me</div></div></div></div>
          </div>
        </div>
      </section>

      <section className="ticker">
        <div className="ticker-track">
          <div className="ticker-inner">
            {["Novi oglasi svaki dan", "Brzi poslovi", "Provjerene firme", "Kandidati i CV profili", "Baneri i premium pozicije"].map((item) => (
              <span className="ticker-item" key={item}>{item}</span>
            ))}
          </div>
        </div>
      </section>

      <section className="section" style={{ background: "var(--mid)" }}>
        <div className="sec-head">
          <h2>Najtraženije <span>Kategorije</span></h2>
          <p>Brzo uđi u oblasti koje kandidati i firme najčešće pretražuju.</p>
        </div>
        <div className="cat-grid nx-container">
          {(categories.length ? categories : [
            { id: "1", name: "Ugostiteljstvo" },
            { id: "2", name: "Prodaja" },
            { id: "3", name: "Administracija" },
            { id: "4", name: "IT" },
          ]).map((category, index) => (
            <Link className="cat-card" href={`/oglasi?category=${encodeURIComponent(category.name)}`} key={category.id}>
              <div className="cat-icon-wrap">{["🍽️", "🛒", "💻", "📋", "🏗️", "🎯", "🚚", "⭐"][index % 8]}</div>
              <h4>{category.name}</h4>
              <p>Aktivni oglasi i angažmani</p>
              <span className="cat-read">Pogledaj →</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="section jobs-discover-wrap">
        <div className="sec-head">
          <h2>Otkrij Nove <span>Prilike</span></h2>
          <p>Najnoviji oglasi prikazani u stilu prototipa, ali sa tvojim podacima.</p>
        </div>
        <div className="nx-container nx-jobs-grid">
          {jobs.length ? jobs.map((job) => <JobCardClean job={job} key={job.id} />) : (
            <div className="empty-proto">Trenutno nema aktivnih oglasa.</div>
          )}
        </div>
      </section>

      <section className="section" style={{ background: "var(--pale)" }}>
        <div className="sec-head sec-head-dark">
          <h2>Top <span>Firme</span></h2>
          <p>Direktorijum poslodavaca i profili firmi sa otvorenim pozicijama.</p>
        </div>
        <div className="comp-grid nx-container">
          {companies.length ? companies.map((company) => <CompanyCard company={company} key={company.id} />) : (
            <div className="empty-proto">Firme se prikazuju nakon odobrenja.</div>
          )}
        </div>
      </section>

      <section className="section" style={{ background: "var(--dark)" }}>
        <div className="cta-box nx-container">
          <div>
            <h2>Pronađi Sledeći Posao iz 5.000+ Oglasa</h2>
            <p>Pretraži oglase, napravi CV profil ili pronađi radnika za brzi angažman.</p>
            <Link className="btn-search" href="/oglasi">Otvori oglase</Link>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={homeImg("career1.webp")} alt="Tim na poslu" />
        </div>
      </section>
    </main>
  );
}
