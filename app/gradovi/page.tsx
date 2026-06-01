import Link from "next/link";
import { BannerSlot } from "@/components/banner-slot";
import { EmptyState, SectionHead } from "@/components/ui";
import { getLookups } from "@/lib/queries/public";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Gradovi — oglasi po gradu",
  description: "Pregled svih gradova u Crnoj Gori sa aktivnim oglasima na imaposla.me.",
};



export default async function CitiesPage() {
  const { cities } = await getLookups();
  return (
    <>
      <SectionHead label="Gradovi" title="Poslovi po gradovima" text="Brz pregled oglasa po lokaciji." />
      <div className="grid three">
        {cities.map((city) => <Link className="card link-card" href={`/gradovi/${encodeURIComponent(city.name)}`} key={city.id}><h3>{city.name}</h3><p>Pogledaj aktivne oglase u ovom gradu.</p></Link>)}
        {!cities.length ? <EmptyState title="Nema gradova" text="Dodaj gradove u Supabase tabelu cities." /> : null}
      </div>
      <BannerSlot placement="city_page_top" />
    </>
  );
}
