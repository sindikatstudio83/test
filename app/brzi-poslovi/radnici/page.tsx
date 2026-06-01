import type { Metadata } from "next";
import Link from "next/link";
import { BannerSlot } from "@/components/banner-slot";
import { WorkerCard } from "@/components/worker-card";
import { getPublicWorkers, getProfessions } from "@/lib/queries/brzi-poslovi";
import { availabilityLabels } from "@/lib/labels";
import type { AvailabilityType } from "@/types/domain";

export const metadata: Metadata = {
  title: "Dostupni radnici — brzi poslovi",
  description: "Lista dostupnih radnika za brze i jednokratne angažmane u Crnoj Gori. Filtriraj po zanimanju, gradu i dostupnosti.",
  alternates: { canonical: "https://imaposla.me/brzi-poslovi/radnici" },
};

export const revalidate = 120;

type Props = {
  searchParams: Promise<{ profession?: string; city?: string; availability?: string }>;
};

export default async function RadniciPage({ searchParams }: Props) {
  const params = await searchParams;
  const [workers, professions] = await Promise.all([
    getPublicWorkers({
      profession: params.profession,
      city: params.city,
      availability: params.availability,
      limit: 60,
    }),
    getProfessions(),
  ]);

  const activeProf = professions.find((p) => p.slug === params.profession);

  return (
    <>
      <div className="bp-hero">
        <h1>Dostupni radnici</h1>
        <p>{activeProf ? `Radnici: ${activeProf.name}` : "Pronađi radnika za brzi angažman — filtriraj po zanimanju, gradu i dostupnosti."}</p>
      </div>

      <div className="bp-tabs" role="tablist">
        <Link className="bp-tab" href="/brzi-poslovi" role="tab">Pregled</Link>
        <Link className="bp-tab active" href="/brzi-poslovi/radnici" role="tab" aria-selected="true">Dostupni radnici</Link>
        <Link className="bp-tab" href="/brzi-poslovi/angazmani" role="tab">Brzi angažmani</Link>
      </div>

      {/* Profession chips */}
      <div className="bp-professions" aria-label="Filtriraj po zanimanju">
        <Link href="/brzi-poslovi/radnici" className={`bp-prof-chip${!params.profession ? " active" : ""}`}>
          Sve
        </Link>
        {professions.map((p) => (
          <Link
            key={p.id}
            href={`/brzi-poslovi/radnici?profession=${p.slug}`}
            className={`bp-prof-chip${params.profession === p.slug ? " active" : ""}`}
          >
            {p.icon && <span className="bp-prof-chip__icon" aria-hidden>{p.icon}</span>}
            {p.name}
          </Link>
        ))}
      </div>

      {/* Availability filter */}
      <form className="bp-filters" method="get" action="/brzi-poslovi/radnici">
        {params.profession && <input type="hidden" name="profession" value={params.profession} />}
        <input className="field" name="city" placeholder="Grad (npr. Podgorica)" defaultValue={params.city || ""} aria-label="Grad" />
        <select className="select" name="availability" defaultValue={params.availability || ""} aria-label="Dostupnost">
          <option value="">Sva dostupnost</option>
          {(Object.keys(availabilityLabels) as AvailabilityType[]).map((a) => (
            <option key={a} value={a}>{availabilityLabels[a]}</option>
          ))}
        </select>
        <button className="btn blue" type="submit">Filtriraj</button>
      </form>

      <BannerSlot placement="jobs_list_middle" />

      {workers.length > 0 ? (
        <div className="bp-worker-grid">
          {workers.map((w) => <WorkerCard key={w.id} worker={w} />)}
        </div>
      ) : (
        <div className="bp-empty">
          <strong>Nema radnika za zadatu pretragu</strong>
          <p>Pokušaj sa drugim filterima ili napravi svoj brzi profil.</p>
          <Link className="btn blue" href="/profil/brzi-profil">Napravi brzi profil →</Link>
        </div>
      )}

      <BannerSlot placement="jobs_list_bottom" />
    </>
  );
}
