import type { Metadata } from "next";
import Link from "next/link";
import { getHomepageData, getLookups, getPopularTags } from "@/lib/queries/public";

export const metadata: Metadata = {
  title: "imaposla.me - Poslovi u Crnoj Gori",
  description: "Pronadji posao, kandidata ili radnika za brzi angazman u Crnoj Gori.",
};

export const revalidate = 300;

const img = (name: string) => `/nexthire-home/${name}`;

export default async function HomePage() {
  const [homepageData, lookups, popularTags] = await Promise.all([
    getHomepageData(),
    getLookups(),
    getPopularTags(),
  ]);

  const jobs = [
    ...homepageData.paidTopJobs,
    ...homepageData.featuredJobs,
    ...homepageData.regularJobs,
  ];
  const companies = homepageData.recommendedCompanies;
  const categoryItems = [
    ["categories1.webp", "Turizam i ugostiteljstvo", "72+ oglasa"],
    ["categories2.webp", "Administracija", "58+ oglasa"],
    ["categories3.webp", "Prodaja", "84+ oglasa"],
    ["categories4.webp", "IT i digital", "42+ oglasa"],
    ["categories5.webp", "Brzi poslovi", "120+ radnika"],
    ["categories6.webp", "Marketing", "36+ oglasa"],
    ["categories7.webp", "Gradjevina", "65+ oglasa"],
    ["categories8.webp", "Studentski poslovi", "40+ oglasa"],
  ];

  return (
    <div className="jf-home-clone">
      <section className="jf-hero">
        <div className="jf-hero-card">
          <div className="jf-hero-copy">
            <h1>Find Your Dream Job Today!</h1>
            <p>Pronadji posao koji odgovara tvom iskustvu, interesovanju i gradu. Od brzih angazmana do stalnih pozicija.</p>
            <form className="jf-search" action="/oglasi">
              <input name="q" placeholder="Job Title or Company" aria-label="Naziv posla ili firma" />
              <select name="city" aria-label="Lokacija">
                <option value="">Select Location</option>
                {lookups.cities.map((city) => (
                  <option value={city.name} key={city.id}>{city.name}</option>
                ))}
              </select>
              <select name="category" aria-label="Kategorija">
                <option value="">Select Category</option>
                {lookups.categories.map((category) => (
                  <option value={category.name} key={category.id}>{category.name}</option>
                ))}
              </select>
              <button type="submit">Search Job</button>
            </form>
            <div className="jf-stats">
              <div><span>25,850</span><small>Jobs</small></div>
              <div><span>10,250</span><small>Candidates</small></div>
              <div><span>18,400</span><small>Companies</small></div>
            </div>
          </div>
        </div>
        <div className="jf-hero-image">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={img("heroImg1.webp")} alt="Professional woman in yellow blazer" />
        </div>
        <div className="jf-seal">imaposla.me - imaposla.me -</div>
      </section>

      <section className="jf-company-strip">
        <div className="jf-marquee">
          <div className="jf-marquee-track">
            <span>Work With Exciting 100+ <b>Companies</b> In The World</span>
            <span>Work With Exciting 100+ <b>Companies</b> In The World</span>
            <span>Work With Exciting 100+ <b>Companies</b> In The World</span>
            <span>Work With Exciting 100+ <b>Companies</b> In The World</span>
          </div>
        </div>
        <div className="jf-logo-row">
          {["opencross.webp", "shopcross.webp", "slackcross.webp", "amzoncross.webp", "opencross.webp", "shopcross.webp", "slackcross.webp"].map((name, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={img(name)} alt="Company logo" key={`${name}-${i}`} />
          ))}
        </div>
      </section>

      <section className="jf-categories">
        <div className="jf-section-title">
          <h2>Most Searched <span>Categories</span></h2>
          <p>Najtrazenije kategorije poslova i brzih angazmana na imaposla.me.</p>
        </div>
        <div className="jf-category-grid">
          {categoryItems.map(([icon, title, meta]) => (
            <Link className="jf-category-card" href={`/oglasi?q=${encodeURIComponent(title)}`} key={title}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img(icon)} alt={`${title} icon`} />
              <strong>{title}</strong>
              <small>{meta}</small>
              <span>Read More</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="jf-how">
        <div className="jf-how-copy">
          <h2>How it&apos;s Work?</h2>
          <p>Pronadji posao, napravi profil ili zaposli ljude kroz nekoliko jednostavnih koraka.</p>
        </div>
        <div className="jf-how-steps">
          {[
            ["1", "Create Account", "Registruj se kao kandidat, radnik ili firma."],
            ["2", "Complete Profile", "Dodaj podatke, iskustvo, usluge ili profil firme."],
            ["3", "Search Job", "Filtriraj oglase, radnike i firme po lokaciji."],
            ["4", "Apply job or hire", "Posalji prijavu ili kontaktiraj kandidata odmah."],
          ].map(([n, title, text]) => (
            <article className="jf-step" key={n}>
              <b>{n}</b>
              <h3>{title}</h3>
              <p>{text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="jf-stories">
        <div className="jf-section-title jf-section-title--left">
          <h2>Candidate Success Stories</h2>
          <p>Ljudi i firme koji su brze dosli do pravog kontakta.</p>
        </div>
        <div className="jf-story-grid">
          {["candidate1.jpg", "candidate2.jpg", "candidate3.jpg"].map((photo, i) => (
            <article className="jf-story-card" key={photo}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img(photo)} alt="Candidate portrait" />
              <p>Platforma mi je pomogla da brzo dodjem do relevantnih oglasa i kontakata bez komplikacija.</p>
              <strong>{["Marco Kihn", "Darlene Robertson", "Jenny Wilson"][i]}</strong>
              <small>{["Hiring Manager", "Project Manager", "Talent Lead"][i]}</small>
            </article>
          ))}
        </div>
      </section>

      <section className="jf-cta">
        <div>
          <h2>Find Your Next Job from 5,000+ Openings</h2>
          <p>Pretrazi oglase, napravi profil i budi vidljiv firmama koje zaposljavaju.</p>
          <Link href="/oglasi">Find a job</Link>
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={img("career1.webp")} alt="People working together in an office" />
      </section>

      <section className="jf-tips">
        <div className="jf-section-title">
          <h2>Little Career Tips That Help</h2>
          <p>Kratki savjeti za bolju prijavu, CV i razgovor za posao.</p>
        </div>
        <div className="jf-tip-layout">
          <article className="jf-tip-large">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={img("discover1.webp")} alt="Career discussion" />
            <span>Recent Posts</span>
            <h3>Kako da tvoja prijava izgleda profesionalno</h3>
            <Link href="/oglasi">Read More</Link>
          </article>
          <div className="jf-tip-list">
            {(popularTags.length ? popularTags.slice(0, 4) : [
              { label: "CV", q: "CV" },
              { label: "Razgovor", q: "Razgovor" },
              { label: "Sezonski posao", q: "Sezonski posao" },
              { label: "Brzi angazman", q: "Brzi angazman" },
            ]).map((tip, i) => (
              <Link href={`/oglasi?q=${encodeURIComponent(tip.q)}`} className="jf-tip-row" key={`${tip.q}-${i}`}>
                <span>0{i + 1} Jan 2026</span>
                <strong>{tip.label}</strong>
                <small>Read More</small>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
