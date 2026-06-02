import Link from "next/link";
import { Avatar } from "@/components/avatar";
import { availabilityShort } from "@/lib/labels";
import type { PublicWorkerProfile } from "@/types/domain";

export function WorkerCard({ worker }: { worker: PublicWorkerProfile }) {
  const profession = worker.professions?.name || worker.profession_text || "Radnik";
  const icon = worker.professions?.icon;
  const href = worker.is_premium && worker.slug
    ? `/radnici/${worker.slug}`
    : `/brzi-poslovi/radnici/${worker.id}`;

  const cityLabel = worker.cities.length
    ? worker.cities.slice(0, 2).join(", ") + (worker.cities.length > 2 ? "..." : "")
    : "Crna Gora";

  return (
    <article className={`cand-card nx-worker-card${worker.is_premium ? " nx-worker-card--premium" : ""}`}>
      <div className="cand-head">
        <Link className="cand-photo nx-worker-photo" href={href} aria-label={worker.display_name}>
          <Avatar
            bucket="worker-photos"
            path={worker.photo_path}
            fallback={worker.display_name}
            size={72}
            shape="rounded"
          />
        </Link>
        <div className="bp-worker-headinfo">
          <span className="cand-name">
            {worker.display_name}
            {worker.is_verified && (
              <span className="bp-worker-verified" title="Verifikovan" aria-label="Verifikovan">✓</span>
            )}
          </span>
          <span className="cand-role">
            {icon ? `${icon} ` : ""}{profession}
          </span>
        </div>
      </div>

      <div className="cand-loc"><span>Lokacija:</span>{cityLabel}</div>

      <div className="cand-tagrow">
        <span className="jtag jtag-gray">{cityLabel}</span>
        <span className="jtag jtag-green">{availabilityShort[worker.availability]}</span>
        {worker.experience_years > 0 && (
          <span className="jtag jtag-gray">{worker.experience_years} god. iskustva</span>
        )}
        {worker.price_text && <span className="jtag jtag-red">{worker.price_text}</span>}
      </div>

      {worker.bio && <p className="cand-bio">{worker.bio}</p>}

      <div className="cand-actions">
        <Link className="btn-details" href={href}>Vidi profil</Link>
        <Link className="btn-outline-sm" href={`${href}#kontakt`}>Kontaktiraj</Link>
      </div>
    </article>
  );
}
