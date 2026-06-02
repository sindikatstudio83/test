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
    <section className="nh-page">
      <WorkerViewTracker workerId={worker.id} />

      <div className="nh-profile-hero">
        <div className="nh-container nh-profile-hero-grid">
          <div className="nh-profile-photo">
            <Avatar bucket="worker-photos" path={worker.photo_path} fallback={worker.display_name} size={170} shape="rounded" />
          </div>
          <div className="nh-profile-title">
            <Link className="nh-back" href="/brzi-poslovi/radnici">Nazad na radnike</Link>
            <h1>
              {worker.display_name}
              {worker.is_verified && <span className="nh-check" title="Verifikovan radnik">✓</span>}
            </h1>
            <p>{icon ? `${icon} ` : ""}{profession}</p>
            <div className="nh-chip-row">
              {worker.is_premium && <span className="nh-chip nh-chip-red">Premium</span>}
              {worker.cities.map((c) => <span key={c} className="nh-chip">{c}</span>)}
              <span className="nh-chip">{availabilityLabels[worker.availability]}</span>
              {worker.experience_years > 0 && <span className="nh-chip">{worker.experience_years} god. iskustva</span>}
              {worker.price_text && <span className="nh-chip">{worker.price_text}</span>}
            </div>
          </div>
        </div>
      </div>

      <div className="nh-container nh-detail-grid">
        <article className="nh-cv-card">
          <section>
            <span className="nh-small-label">CV profil</span>
            <h2>O meni</h2>
            <p>{worker.bio || "Kandidat jos nije dodao opis profila."}</p>
          </section>

          <section className="nh-cv-facts">
            <div><span>Zanimanje</span><strong>{profession}</strong></div>
            <div><span>Dostupnost</span><strong>{availabilityLabels[worker.availability]}</strong></div>
            <div><span>Gradovi</span><strong>{worker.cities.join(", ") || "Crna Gora"}</strong></div>
            <div><span>Jezici</span><strong>{worker.languages || "Nije navedeno"}</strong></div>
          </section>

          {worker.is_premium && portfolio.length > 0 && (
            <section>
              <h2>Galerija radova</h2>
              <div className="nh-portfolio-grid">
                {portfolio.map((img) => (
                  <div key={img.id} className="nh-portfolio-img">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={`${supabaseUrl}/storage/v1/object/public/worker-photos/${img.image_path}`} alt="Rad iz portfolija" loading="lazy" />
                  </div>
                ))}
              </div>
            </section>
          )}
        </article>

        <aside className="nh-contact-card" id="kontakt">
          <h2>Kontaktiraj kandidata</h2>
          <WorkerContact worker={worker} />
        </aside>
      </div>
    </section>
  );
}
