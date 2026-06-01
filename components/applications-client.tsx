"use client";

import { useRouter } from "next/navigation";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { createBrowserSupabase } from "@/lib/supabase/client";
import { stageLabels, stageOrder, gigStatusLabels } from "@/lib/labels";
import type { JobApplication, QuickGigApplication } from "@/types/domain";

export function ApplicationsClient() {
  const router = useRouter();
  const { role, userId, ready } = useAuth();
  const [apps, setApps] = useState<JobApplication[]>([]);
  const [gigApps, setGigApps] = useState<QuickGigApplication[]>([]);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ready) return;

    if (!userId || role === "guest") {
      router.replace("/login?next=/profil/prijave");
      return;
    }

    if (role !== "candidate" && role !== "admin") {
      router.replace("/profil");
      return;
    }

    const supabase = createBrowserSupabase();

    async function load() {
      const [appsRes, gigsRes] = await Promise.all([
        supabase
          .from("job_applications")
          .select("*,jobs(id,title,slug,company_id,companies(name,slug))")
          .eq("candidate_id", userId!)
          .order("created_at", { ascending: false }),
        supabase
          .from("quick_gig_applications")
          .select("*,quick_gigs(id,title,city,status)")
          .eq("candidate_id", userId!)
          .order("created_at", { ascending: false }),
      ]);

      if (appsRes.error) console.error("[ApplicationsClient]", appsRes.error.message);
      setApps((appsRes.data || []) as JobApplication[]);
      setGigApps((gigsRes.data || []) as unknown as QuickGigApplication[]);
      setLoading(false);
    }
    load();
  }, [ready, role, userId, router]);

  if (!ready || loading) {
    return <div className="panel loading-panel"><p>Učitavanje prijava...</p></div>;
  }

  const filtered = filter === "all" ? apps : apps.filter(a => a.stage === filter);

  return (
    <section>
      <div className="section-head">
        <div>
          <span className="page-label">Kandidat</span>
          <h1>Moje prijave</h1>
          <p className="sub">{apps.length} {apps.length === 1 ? "prijava" : "prijava"} ukupno</p>
        </div>
        <Link className="btn blue" href="/oglasi">Traži novi posao →</Link>
      </div>

      {apps.length > 0 && (
        <div className="filter-tabs" role="tablist">
          <button
            className={`tab${filter === "all" ? " active" : ""}`}
            onClick={() => setFilter("all")}
            type="button"
          >
            Sve ({apps.length})
          </button>
          {stageOrder.map(stage => {
            const count = apps.filter(a => a.stage === stage).length;
            if (!count) return null;
            return (
              <button
                key={stage}
                className={`tab${filter === stage ? " active" : ""}`}
                onClick={() => setFilter(stage)}
                type="button"
              >
                {stageLabels[stage]} ({count})
              </button>
            );
          })}
        </div>
      )}

      <div className="table-card">
        {filtered.map(app => (
          <Link
            href={`/oglasi/${(app.jobs as unknown as { slug?: string })?.slug || ""}`}
            className="table-row"
            key={app.id}
          >
            <div>
              <strong>{(app.jobs as { title?: string })?.title || "Oglas"}</strong>
              <small>{(app.jobs as unknown as { companies?: { name?: string } })?.companies?.name || ""}</small>
            </div>
            <div><span className={`status-badge stage-${app.stage}`}>{stageLabels[app.stage]}</span></div>
            <div className="muted">{app.reference_code}</div>
            <div className="muted">{new Date(app.created_at).toLocaleDateString("sr-ME")}</div>
          </Link>
        ))}
        {!filtered.length && (
          <div className="empty">
            <strong>{apps.length ? "Nema prijava u ovoj kategoriji" : "Još nema prijava"}</strong>
            <p>{apps.length ? "Promijeni filter ili pogledaj sve prijave." : "Pošalji prvu prijavu i prati status iz dashboarda."}</p>
            <div className="actions">
              {filter !== "all" && apps.length
                ? <button className="btn ghost sm" onClick={() => setFilter("all")} type="button">Prikaži sve</button>
                : <Link className="btn blue sm" href="/oglasi">Otvori oglase →</Link>
              }
            </div>
          </div>
        )}
      </div>

      {/* Brze prijave (quick gig applications) */}
      <div className="section-head compact-head" style={{ marginTop: 28 }}>
        <div>
          <h2>⚡ Prijave na brze angažmane</h2>
          <p className="sub">{gigApps.length} {gigApps.length === 1 ? "prijava" : "prijava"}</p>
        </div>
        <Link className="btn ghost sm" href="/brzi-poslovi/angazmani">Brzi angažmani →</Link>
      </div>

      <div className="table-card">
        {gigApps.map(ga => {
          const gig = ga.quick_gigs;
          return (
            <Link href={`/brzi-poslovi/angazmani/${gig?.id ?? ""}`} className="table-row" key={ga.id}>
              <div>
                <strong>{gig?.title || "Angažman"}</strong>
                <small>{gig?.city || ""}</small>
              </div>
              <div>
                {gig?.status && <span className={`status-badge ${gig.status === "active" ? "stage-hired" : "stage-review"}`}>{gigStatusLabels[gig.status]}</span>}
              </div>
              <div className="muted" style={{ overflowWrap: "anywhere" }}>{ga.message ? ga.message.slice(0, 40) + (ga.message.length > 40 ? "…" : "") : "—"}</div>
              <div className="muted">{new Date(ga.created_at).toLocaleDateString("sr-ME")}</div>
            </Link>
          );
        })}
        {gigApps.length === 0 && (
          <div className="empty">
            <strong>Još nema prijava na brze angažmane</strong>
            <p>Pogledaj dostupne brze angažmane i prijavi se.</p>
            <Link className="btn blue sm" href="/brzi-poslovi/angazmani">Brzi angažmani →</Link>
          </div>
        )}
      </div>
    </section>
  );
}
