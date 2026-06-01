import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BannerSlot } from "@/components/banner-slot";
import { WorkerCard } from "@/components/worker-card";
import { GigCard } from "@/components/gig-card";
import { getProfessions, getPublicWorkers, getPublicGigs } from "@/lib/queries/brzi-poslovi";

export const revalidate = 300;

const SITE = "https://imaposla.me";

type Props = { params: Promise<{ slug: string }> };

// Pre-render the known professions for SEO landing pages
export async function generateStaticParams() {
  const professions = await getProfessions().catch(() => []);
  return professions.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const professions = await getProfessions();
  const prof = professions.find((p) => p.slug === slug);
  if (!prof) return { title: "Zanimanje nije pronađeno" };

  const title = `${prof.name} — brzi poslovi i dostupni radnici`;
  const description = `Pronađi ${prof.name.toLowerCase()} za brzi angažman u Crnoj Gori ili ponudi svoje usluge. Dostupni radnici i kratki poslovi na jednom mjestu.`;
  const canonical = `${SITE}/brzi-poslovi/zanimanje/${slug}`;

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: { title, description, url: canonical, type: "website" },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function ProfessionLandingPage({ params }: Props) {
  const { slug } = await params;
  const professions = await getProfessions();
  const prof = professions.find((p) => p.slug === slug);
  if (!prof) return notFound();

  const [workers, gigs] = await Promise.all([
    getPublicWorkers({ profession: slug, limit: 12 }),
    getPublicGigs({ profession: slug, limit: 8 }),
  ]);

  return (
    <>
      <div className="bp-hero">
        <h1>{prof.icon ? `${prof.icon} ` : ""}{prof.name}</h1>
        <p>Dostupni radnici ({prof.name.toLowerCase()}) i aktuelni brzi angažmani u Crnoj Gori. Kontaktiraj direktno ili objavi svoju ponudu.</p>
      </div>

      <div className="bp-tabs" role="tablist">
        <Link className="bp-tab" href="/brzi-poslovi" role="tab">Pregled</Link>
        <Link className="bp-tab" href={`/brzi-poslovi/radnici?profession=${slug}`} role="tab">Radnici</Link>
        <Link className="bp-tab" href={`/brzi-poslovi/angazmani?profession=${slug}`} role="tab">Angažmani</Link>
      </div>

      <div className="bp-section-head">
        <h2>Dostupni radnici — {prof.name}</h2>
        <Link className="bp-see-all" href={`/brzi-poslovi/radnici?profession=${slug}`}>Svi →</Link>
      </div>
      {workers.length > 0 ? (
        <div className="bp-worker-grid">{workers.map((w) => <WorkerCard key={w.id} worker={w} />)}</div>
      ) : (
        <div className="bp-empty">
          <strong>Još nema radnika za ovo zanimanje</strong>
          <p>Budi prvi — napravi brzi profil.</p>
          <Link className="btn blue" href="/profil/brzi-profil">Napravi brzi profil →</Link>
        </div>
      )}

      <BannerSlot placement="jobs_list_middle" />

      <div className="bp-section-head">
        <h2>Brzi angažmani — {prof.name}</h2>
        <Link className="bp-see-all" href={`/brzi-poslovi/angazmani?profession=${slug}`}>Svi →</Link>
      </div>
      {gigs.length > 0 ? (
        <div className="bp-gig-grid">{gigs.map((g) => <GigCard key={g.id} gig={g} />)}</div>
      ) : (
        <div className="bp-empty">
          <strong>Trenutno nema angažmana za ovo zanimanje</strong>
          <Link className="btn blue" href="/firma/brzi-angazman">Objavi angažman →</Link>
        </div>
      )}

      {/* Internal links to other professions for SEO */}
      <div className="bp-professions" style={{ marginTop: 24, flexWrap: "wrap", overflowX: "visible" }} aria-label="Druga zanimanja">
        {professions.filter((p) => p.slug !== slug).map((p) => (
          <Link key={p.id} href={`/brzi-poslovi/zanimanje/${p.slug}`} className="bp-prof-chip">
            {p.icon && <span className="bp-prof-chip__icon" aria-hidden>{p.icon}</span>}
            {p.name}
          </Link>
        ))}
      </div>
    </>
  );
}
