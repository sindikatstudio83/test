import type { Metadata } from "next";
import Link from "next/link";
import { BannerSlot } from "@/components/banner-slot";
import { GigCard } from "@/components/gig-card";
import { getPublicGigs, getProfessions } from "@/lib/queries/brzi-poslovi";

export const metadata: Metadata = {
  title: "Brzi angažmani — kratki poslovi",
  description: "Aktivni brzi angažmani u Crnoj Gori: jednokratni i kratki poslovi za konobare, molere, hostese, pomoćne radnike i sezonske poslove.",
  alternates: { canonical: "https://imaposla.me/brzi-poslovi/angazmani" },
};

export const revalidate = 120;

type Props = {
  searchParams: Promise<{ profession?: string; city?: string; urgent?: string }>;
};

export default async function AngazmaniPage({ searchParams }: Props) {
  const params = await searchParams;
  const [gigs, professions] = await Promise.all([
    getPublicGigs({
      profession: params.profession,
      city: params.city,
      urgent: params.urgent === "1",
      limit: 60,
    }),
    getProfessions(),
  ]);

  return (
    <>
      <div className="bp-hero">
        <h1>Brzi angažmani</h1>
        <p>Kratki i jednokratni poslovi — prijavi se odmah. Konobari za večeras, hostese za event, moleri, pomoćni radnici i sezonski poslovi.</p>
      </div>

      <div className="bp-tabs" role="tablist">
        <Link className="bp-tab" href="/brzi-poslovi" role="tab">Pregled</Link>
        <Link className="bp-tab" href="/brzi-poslovi/radnici" role="tab">Dostupni radnici</Link>
        <Link className="bp-tab active" href="/brzi-poslovi/angazmani" role="tab" aria-selected="true">Brzi angažmani</Link>
      </div>

      <div className="bp-professions" aria-label="Filtriraj po zanimanju">
        <Link href="/brzi-poslovi/angazmani" className={`bp-prof-chip${!params.profession ? " active" : ""}`}>Sve</Link>
        {professions.map((p) => (
          <Link
            key={p.id}
            href={`/brzi-poslovi/angazmani?profession=${p.slug}`}
            className={`bp-prof-chip${params.profession === p.slug ? " active" : ""}`}
          >
            {p.icon && <span className="bp-prof-chip__icon" aria-hidden>{p.icon}</span>}
            {p.name}
          </Link>
        ))}
      </div>

      <form className="bp-filters" method="get" action="/brzi-poslovi/angazmani">
        {params.profession && <input type="hidden" name="profession" value={params.profession} />}
        <input className="field" name="city" placeholder="Grad" defaultValue={params.city || ""} aria-label="Grad" />
        <select className="select" name="urgent" defaultValue={params.urgent || ""} aria-label="Hitnost">
          <option value="">Svi angažmani</option>
          <option value="1">Samo hitni</option>
        </select>
        <button className="btn blue" type="submit">Filtriraj</button>
      </form>

      <BannerSlot placement="jobs_list_middle" />

      {gigs.length > 0 ? (
        <div className="bp-gig-grid">
          {gigs.map((g) => <GigCard key={g.id} gig={g} />)}
        </div>
      ) : (
        <div className="bp-empty">
          <strong>Nema aktivnih angažmana</strong>
          <p>Trenutno nema brzih angažmana za zadatu pretragu.</p>
          <Link className="btn blue" href="/firma/brzi-angazman">Objavi angažman →</Link>
        </div>
      )}

      <BannerSlot placement="jobs_list_bottom" />
    </>
  );
}
