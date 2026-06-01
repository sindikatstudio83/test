"use client";

import { useRouter } from "next/navigation";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { createBrowserSupabase } from "@/lib/supabase/client";
import { getSavedJobs } from "@/lib/queries/account";
import { roleHomes, roleLabels, stageLabels } from "@/lib/labels";
import type { JobApplication, Profile, UserRole, SavedJob } from "@/types/domain";

type AccountState = {
  profile: Profile | null;
  applications: JobApplication[];
  saved: SavedJob[];
};

function homeForRole(role: UserRole) {
  if (role === "guest") return "/login";
  return roleHomes[role];
}

export function DashboardClient({ expectedRole, title }: { expectedRole: Exclude<UserRole, "guest">; title: string }) {
  const router = useRouter();
  const { role, userId, email, ready } = useAuth();
  const [account, setAccount] = useState<AccountState>({ profile: null, applications: [], saved: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ready) return;

    if (role === "guest" || !userId) {
      router.replace("/login?next=/profil");
      return;
    }
    if (role !== expectedRole && role !== "admin") {
      router.replace(homeForRole(role));
      return;
    }

    const supabase = createBrowserSupabase();

    async function load() {
      const promises: Promise<unknown>[] = [
        supabase.from("profiles").select("*").eq("id", userId!).maybeSingle()
      ];

      if (expectedRole === "candidate") {
        promises.push(
          supabase
            .from("job_applications")
            .select("*,jobs(id,title,slug,company_id,companies(name,slug))")
            .eq("candidate_id", userId!)
            .order("created_at", { ascending: false })
            .limit(20)
        );
        promises.push(getSavedJobs(userId!));
      }

      const results = await Promise.all(promises);
      const profileResult = results[0] as { data: Profile | null; error: { message: string } | null };
      const appResult = results[1] as { data: JobApplication[] | null; error: { message: string } | null } | undefined;
      const savedResult = results[2] as SavedJob[] | undefined;

      if (profileResult.error) console.error("[DashboardClient:profile]", profileResult.error.message);

      const profile = (profileResult.data || {
        id: userId!,
        role,
        full_name: null,
        email: email || null,
        phone: null,
        city: null
      }) as Profile;

      setAccount({
        profile,
        applications: (appResult?.data || []) as JobApplication[],
        saved: savedResult || []
      });
      setLoading(false);
    }
    load();
  }, [ready, role, userId, email, expectedRole, router]);

  if (!ready || loading) {
    return (
      <div className="panel loading-panel">
        <p>Učitavanje...</p>
      </div>
    );
  }

  const cvPercent = (() => {
    const cv = account.profile?.cv_data;
    if (!cv) return 0;
    const fields = ["fullName", "title", "city", "phone", "email", "summary", "skills", "experience", "education"] as const;
    const filled = fields.filter((f) => Boolean((cv as Record<string, unknown>)[f])).length;
    return Math.round((filled / fields.length) * 100);
  })();

  const apps = account.applications;
  const pending = apps.filter(a => a.stage === "applied").length;
  const inProgress = apps.filter(a => ["review", "interview", "shortlist", "offer"].includes(a.stage)).length;
  const hired = apps.filter(a => a.stage === "hired").length;

  return (
    <section>
      <div className="section-head">
        <div>
          <span className="page-label">{roleLabels[role]}</span>
          <h1>{title}</h1>
          <p className="sub">{account.profile?.email || email}</p>
        </div>
        <div className="head-actions">
          {expectedRole === "candidate" && (
            <>
              <Link className="btn ghost" href="/profil/biografija">Uredi biografiju</Link>
              <Link className="btn blue" href="/oglasi">Pretraži oglase</Link>
            </>
          )}
        </div>
      </div>

      {expectedRole === "candidate" && cvPercent < 60 && (
        <div className="notice-card warn" style={{ marginBottom: 18 }}>
          <strong>Biografija je popunjena {cvPercent}%</strong>
          <p>Dopuni biografiju da bi mogao slati prijave i da te firma bolje upozna.</p>
          <div>
            <Link className="btn blue sm" href="/profil/biografija">Dopuni biografiju →</Link>
          </div>
        </div>
      )}

      <div className="dash-grid">
        <div className="metric"><strong>{apps.length}</strong><span>Prijava ukupno</span></div>
        <div className="metric"><strong>{pending}</strong><span>Nove prijave</span></div>
        <div className="metric"><strong>{inProgress}</strong><span>U toku</span></div>
        <div className="metric"><strong>{hired || cvPercent + "%"}</strong><span>{hired ? "Zaposlen" : "Biografija"}</span></div>
      </div>

      {expectedRole === "candidate" && (
        <>
          <div className="kicker dash-section-label">Tražim posao</div>
          <div className="quick-links">
            <Link className="quick-link" href="/oglasi">
              <strong>Pretraži oglase</strong>
              <span>Filtriraj po gradu i kategoriji</span>
            </Link>
            <Link className="quick-link" href="/profil/biografija">
              <strong>Moja biografija</strong>
              <span>{cvPercent}% popunjeno</span>
            </Link>
            <Link className="quick-link" href="/profil/prijave">
              <strong>Moje prijave</strong>
              <span>{apps.length} prijava</span>
            </Link>
            <Link className="quick-link" href="/profil/sacuvani">
              <strong>Sačuvani oglasi</strong>
              <span>{account.saved.length} {account.saved.length === 1 ? "oglas" : "oglasa"}</span>
            </Link>
            <Link className="quick-link" href="/profil/interesovanja">
              <strong>Obavještenja za poslove</strong>
              <span>Nedjeljni email sa relevantnim poslovima</span>
            </Link>
          </div>

          <div className="kicker dash-section-label">Nudim brze usluge</div>
          <div className="quick-links">
            <Link className="quick-link" href="/profil/brzi-profil">
              <strong>⚡ Moja ponuda usluga</strong>
              <span>Tvoj javni profil koji firme vide</span>
            </Link>
            <Link className="quick-link" href="/profil/brzi-kontakti">
              <strong>Upiti za mene</strong>
              <span>Poruke od firmi i korisnika</span>
            </Link>
            <Link className="quick-link" href="/brzi-poslovi/angazmani">
              <strong>Brzi angažmani</strong>
              <span>Kratki poslovi za prijavu</span>
            </Link>
          </div>

          <div className="section-head compact-head">
            <div>
              <h2>Nedavne prijave</h2>
            </div>
            {apps.length > 5 && <Link className="btn ghost sm" href="/profil/prijave">Sve prijave →</Link>}
          </div>

          <div className="table-card">
            {apps.slice(0, 5).map((app) => (
              <div className="table-row" key={app.id}>
                <div>
                  <strong>{app.jobs?.title || "Prijava"}</strong>
                  <small>{(app.jobs as unknown as { companies?: { name?: string } })?.companies?.name || ""}</small>
                </div>
                <div><span className={`status-badge stage-${app.stage}`}>{stageLabels[app.stage]}</span></div>
                <div className="muted">{app.reference_code}</div>
                <div className="muted">{new Date(app.created_at).toLocaleDateString("sr-ME")}</div>
              </div>
            ))}
            {!apps.length && (
              <div className="empty">
                <strong>Još nema prijava</strong>
                <p>Pošalji prvu prijavu i prati status iz dashboarda.</p>
                <div className="actions">
                  <Link className="btn blue sm" href="/oglasi">Otvori oglase →</Link>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </section>
  );
}
