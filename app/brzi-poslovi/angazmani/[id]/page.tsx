import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { GigApplyForm } from "@/components/gig-apply-form";
import { BannerSlot } from "@/components/banner-slot";
import { formatDate } from "@/lib/format";
import { getGigById } from "@/lib/queries/brzi-poslovi";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const gig = await getGigById(Number(id));
  if (!gig) return { title: "Angažman nije pronađen" };
  return {
    title: `${gig.title} — ${gig.city}`,
    description: gig.description?.slice(0, 160) || `Brzi angažman u ${gig.city}.`,
  };
}

export default async function GigDetailPage({ params }: Props) {
  const { id } = await params;
  const gig = await getGigById(Number(id));
  if (!gig) return notFound();

  const profession = gig.professions?.name;
  const icon = gig.professions?.icon;
  const timing = gig.gig_timing || (gig.gig_date ? formatDate(gig.gig_date) : null);
  const poster = gig.companies?.name || "Privatni korisnik";

  return (
    <>
      <div style={{ padding: "16px 0 0" }}>
        <Link className="btn ghost sm" href="/brzi-poslovi/angazmani">← Nazad na angažmane</Link>
      </div>

      <section className="detail-layout with-top-space">
        <article className="panel">
          <div className="tags" style={{ marginBottom: 14 }}>
            {gig.is_urgent && <span className="badge red">Hitno</span>}
            {gig.is_featured && <span className="badge orange">★ Istaknuto</span>}
            {profession && <span className="badge blue">{icon ? `${icon} ` : ""}{profession}</span>}
          </div>

          <h1 className="detail-title">{gig.title}</h1>

          <div className="detail-facts">
            <div className="detail-fact">
              <span className="detail-fact__label">Lokacija</span>
              <span className="detail-fact__value">{gig.city}</span>
            </div>
            {timing && (
              <div className="detail-fact">
                <span className="detail-fact__label">Kada</span>
                <span className="detail-fact__value">{timing}</span>
              </div>
            )}
            {gig.pay_text && (
              <div className="detail-fact">
                <span className="detail-fact__label">Naknada</span>
                <span className="detail-fact__value detail-fact__value--salary">{gig.pay_text}</span>
              </div>
            )}
            <div className="detail-fact">
              <span className="detail-fact__label">Objavio</span>
              <span className="detail-fact__value">{poster}</span>
            </div>
          </div>

          {gig.description && <p className="detail-text">{gig.description}</p>}
        </article>

        <aside className="sticky">
          <div className="card">
            <h2 style={{ fontSize: 20, marginBottom: 14 }}>Prijavi se</h2>
            <BannerSlot placement="job_detail_top" />
            <GigApplyForm gigId={gig.id} />
          </div>
        </aside>
        <BannerSlot placement="job_detail_bottom" />
      </section>
    </>
  );
}
