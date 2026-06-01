import Link from "next/link";
import { Avatar } from "@/components/avatar";
import { WorkerContact } from "@/components/worker-contact";
import { WorkerViewTracker } from "@/components/worker-view-tracker";
import { availabilityLabels } from "@/lib/labels";
import { supabaseUrl } from "@/lib/supabase/config";
import type { PublicWorkerProfile } from "@/types/domain";

export function WorkerDetailView({ worker }: { worker: PublicWorkerProfile }) {
  const profession = worker.professions?.name || worker.profession_text || "Radnik";
  const icon = worker.professions?.icon;
  const portfolio = (worker.worker_portfolio ?? []).sort((a, b) => a.sort - b.sort);

  return (
    <>
      <WorkerViewTracker workerId={worker.id} />

      <div style={{ padding: "16px 0 0" }}>
        <Link className="btn ghost sm" href="/brzi-poslovi/radnici">← Nazad na radnike</Link>
      </div>

      <section className="detail-layout with-top-space">
        <article>
          <div className={`bp-detail-head${worker.is_premium ? " bp-detail-head--premium" : ""}`}>
            <div className="bp-detail-photo">
              <Avatar
                bucket="worker-photos"
                path={worker.photo_path}
                fallback={worker.display_name}
                size={110}
                shape="rounded"
              />
            </div>
            <div className="bp-detail-info">
              <h1 className="bp-detail-name">
                {worker.display_name}
                {worker.is_verified && (
                  <span className="bp-worker-verified" title="Verifikovan radnik" aria-label="Verifikovan">✓</span>
                )}
                {worker.is_premium && <span className="badge orange">★ Premium</span>}
              </h1>
              <span className="bp-detail-profession">{icon ? `${icon} ` : ""}{profession}</span>
              <div className="bp-detail-tags">
                {worker.cities.map((c) => (
                  <span key={c} className="bp-worker-tag">
                    <span aria-hidden>📍</span>{c}
                  </span>
                ))}
                <span className="bp-worker-tag bp-worker-tag--available">
                  {availabilityLabels[worker.availability]}
                  {worker.availability === "specific_date" && worker.available_from
                    ? ` (${worker.available_from})` : ""}
                </span>
                {worker.experience_years > 0 && (
                  <span className="bp-worker-tag">{worker.experience_years} god. iskustva</span>
                )}
                {worker.price_text && (
                  <span className="bp-worker-tag bp-worker-tag--price">{worker.price_text}</span>
                )}
                {worker.languages && (
                  <span className="bp-worker-tag">🗣 {worker.languages}</span>
                )}
              </div>
            </div>
          </div>

          {worker.bio && (
            <div className="bp-detail-section">
              <h2>O meni</h2>
              <p className="bp-detail-bio">{worker.bio}</p>
            </div>
          )}

          {/* Premium portfolio gallery */}
          {worker.is_premium && portfolio.length > 0 && (
            <div className="bp-detail-section">
              <h2>Galerija radova</h2>
              <div className="bp-portfolio-grid">
                {portfolio.map((img) => (
                  <div key={img.id} className="bp-portfolio-img">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`${supabaseUrl}/storage/v1/object/public/worker-photos/${img.image_path}`}
                      alt="Rad iz portfolija"
                      loading="lazy"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </article>

        <aside className="sticky">
          <div className="card" id="kontakt">
            <h2 style={{ fontSize: 20, marginBottom: 14 }}>Kontaktiraj</h2>
            <WorkerContact worker={worker} />
          </div>
        </aside>
      </section>
    </>
  );
}
