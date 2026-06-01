import Link from "next/link";
import { Avatar } from "@/components/avatar";
import { availabilityShort } from "@/lib/labels";
import type { PublicWorkerProfile } from "@/types/domain";

export function WorkerCard({ worker }: { worker: PublicWorkerProfile }) {
  const profession = worker.professions?.name || worker.profession_text || "Radnik";
  const icon = worker.professions?.icon;
  // Premium workers link to their own page; others to id-based detail
  const href = worker.is_premium && worker.slug
    ? `/radnici/${worker.slug}`
    : `/brzi-poslovi/radnici/${worker.id}`;

  const cityLabel = worker.cities.length
    ? worker.cities.slice(0, 2).join(", ") + (worker.cities.length > 2 ? "…" : "")
    : "Crna Gora";

  return (
    <article className={`bp-worker-card${worker.is_premium ? " bp-worker-card--premium" : ""}`}>
      <div className="bp-worker-head">
        <div className="bp-worker-photo">
          <Avatar
            bucket="worker-photos"
            path={worker.photo_path}
            fallback={worker.display_name}
            size={56}
            shape="rounded"
          />
        </div>
        <div className="bp-worker-headinfo">
          <span className="bp-worker-name">
            {worker.display_name}
            {worker.is_verified && (
              <span className="bp-worker-verified" title="Verifikovan" aria-label="Verifikovan">✓</span>
            )}
          </span>
          <span className="bp-worker-profession">
            {icon ? `${icon} ` : ""}{profession}
          </span>
        </div>
      </div>

      <div className="bp-worker-meta">
        <span className="bp-worker-tag">
          <span className="bp-worker-tag__icon" aria-hidden>📍</span>{cityLabel}
        </span>
        <span className="bp-worker-tag bp-worker-tag--available">
          {availabilityShort[worker.availability]}
        </span>
        {worker.experience_years > 0 && (
          <span className="bp-worker-tag">
            {worker.experience_years} god. iskustva
          </span>
        )}
        {worker.price_text && (
          <span className="bp-worker-tag bp-worker-tag--price">
            {worker.price_text}
          </span>
        )}
      </div>

      {worker.bio && <p className="bp-worker-bio">{worker.bio}</p>}

      <div className="bp-worker-actions">
        <Link className="btn blue sm" href={href}>Vidi profil</Link>
        <Link className="btn ghost sm" href={`${href}#kontakt`}>Kontaktiraj</Link>
      </div>
    </article>
  );
}
