import Link from "next/link";
import { formatDate } from "@/lib/format";
import type { QuickGig } from "@/types/domain";

export function GigCard({ gig }: { gig: QuickGig }) {
  const profession = gig.professions?.name;
  const icon = gig.professions?.icon;
  const poster = gig.companies?.name || "Privatni korisnik";

  // Prefer human timing ("vikend", "danas") over a raw date
  const timing = gig.gig_timing || (gig.gig_date ? formatDate(gig.gig_date) : null);

  return (
    <article className={`bp-gig-card${gig.is_urgent ? " bp-gig-card--urgent" : ""}`}>
      <div className="bp-gig-top">
        {gig.is_urgent && <span className="bp-gig-badge bp-gig-badge--urgent">Hitno</span>}
        {gig.is_featured && <span className="bp-gig-badge bp-gig-badge--featured">★ Istaknuto</span>}
        {profession && (
          <span className="bp-gig-badge bp-gig-badge--profession">
            {icon ? `${icon} ` : ""}{profession}
          </span>
        )}
      </div>

      <h3 className="bp-gig-title">{gig.title}</h3>

      <div className="bp-gig-meta">
        <span className="bp-gig-meta-item">
          <span aria-hidden>📍</span>{gig.city}
        </span>
        {timing && (
          <span className="bp-gig-meta-item">
            <span aria-hidden>🗓️</span>{timing}
          </span>
        )}
        {gig.pay_text && (
          <span className="bp-gig-meta-item bp-gig-meta-item--pay">
            <span aria-hidden>💰</span>{gig.pay_text}
          </span>
        )}
      </div>

      {gig.description && <p className="bp-gig-desc">{gig.description}</p>}

      <div className="bp-gig-footer">
        <span className="bp-gig-poster">{poster}</span>
        <Link className="btn blue sm" href={`/brzi-poslovi/angazmani/${gig.id}`}>
          Prijavi se
        </Link>
      </div>
    </article>
  );
}
