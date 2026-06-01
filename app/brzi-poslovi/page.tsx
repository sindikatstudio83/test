import type { Metadata } from "next";
import Link from "next/link";
import { BannerSlot } from "@/components/banner-slot";
import { WorkerCard } from "@/components/worker-card";
import { GigCard } from "@/components/gig-card";
import { getBrziPosloviOverview } from "@/lib/queries/brzi-poslovi";

export const metadata: Metadata = {
  title: "Brzi poslovi — dostupni radnici i kratki angažmani",
  description: "Pronađi radnika odmah ili ponudi svoje usluge: konobari, moleri, hostese, promoteri, pomoćni radnici i sezonski poslovi u Crnoj Gori.",
};

export const revalidate = 300;

export default async function BrziPosloviPage() {
  const { workers, gigs, professions } = await getBrziPosloviOverview();

  return (
    <>
      <div className="bp-hero">
        <h1>Brzi poslovi i radnici</h1>
        <p>Pronađi radnika za kratak angažman ili napravi profil da te drugi kontaktiraju — konobari, moleri, hostese, promoteri, dostavljači i sezonski radnici.</p>
      </div>

      {/* Tab switch */}
      <div className="bp-tabs" role="tablist" aria-label="Brzi poslovi navigacija">
        <Link className="bp-tab active" href="/brzi-poslovi" role="tab" aria-selected="true">
          Pregled
        </Link>
        <Link className="bp-tab" href="/brzi-poslovi/radnici" role="tab" aria-selected="false">
          Dostupni radnici
        </Link>
        <Link className="bp-tab" href="/brzi-poslovi/angazmani" role="tab" aria-selected="false">
          Brzi angažmani
        </Link>
      </div>

      {/* Napravi profil — jasan ulaz za pružaoce usluga */}
      <div className="bp-make-profile">
        <span>Nudiš usluge? Napravi svoj profil da te firme kontaktiraju.</span>
        <Link className="btn blue sm" href="/profil/brzi-profil">Napravi brzi profil →</Link>
      </div>

      {/* Profession chips */}
      {professions.length > 0 && (
        <div className="bp-professions" aria-label="Zanimanja">
          {professions.map((p) => (
            <Link key={p.id} href={`/brzi-poslovi/zanimanje/${p.slug}`} className="bp-prof-chip">
              {p.icon && <span className="bp-prof-chip__icon" aria-hidden>{p.icon}</span>}
              {p.name}
            </Link>
          ))}
        </div>
      )}

      <BannerSlot placement="jobs_list_middle" />

      {/* Available workers */}
      <div className="bp-section-head">
        <h2>Dostupni radnici</h2>
        <Link className="bp-see-all" href="/brzi-poslovi/radnici">Svi radnici →</Link>
      </div>
      {workers.length > 0 ? (
        <div className="bp-worker-grid">
          {workers.map((w) => <WorkerCard key={w.id} worker={w} />)}
        </div>
      ) : (
        <div className="bp-empty">
          <strong>Još nema objavljenih radnika</strong>
          <p>Budi prvi — napravi svoj brzi profil i ponudi svoje usluge.</p>
          <Link className="btn blue" href="/profil/brzi-profil">Napravi brzi profil →</Link>
        </div>
      )}

      {/* Quick gigs */}
      <div className="bp-section-head">
        <h2>Brzi angažmani</h2>
        <Link className="bp-see-all" href="/brzi-poslovi/angazmani">Svi angažmani →</Link>
      </div>
      {gigs.length > 0 ? (
        <div className="bp-gig-grid">
          {gigs.map((g) => <GigCard key={g.id} gig={g} />)}
        </div>
      ) : (
        <div className="bp-empty">
          <strong>Trenutno nema aktivnih angažmana</strong>
          <p>Treba ti radnik odmah? Objavi brzi angažman.</p>
          <Link className="btn blue" href="/firma/brzi-angazman">Objavi angažman →</Link>
        </div>
      )}

      <BannerSlot placement="jobs_list_bottom" />
    </>
  );
}
