"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { createBrowserSupabase } from "@/lib/supabase/client";
import { safeMessage, logError } from "@/lib/errors";
import { DashboardSideNav } from "@/components/dashboard-side-nav";
import { formatDate } from "@/lib/format";
import { gigStatusLabels } from "@/lib/labels";
import type { QuickGig, QuickGigApplication } from "@/types/domain";

type AppRow = QuickGigApplication & {
  profiles?: { full_name: string | null; email: string | null; phone: string | null } | null;
};

export function FirmaGigApplicationsClient({ gigId }: { gigId: number }) {
  const { userId, email: authEmail, ready, role } = useAuth();
  const router = useRouter();
  const [gig, setGig] = useState<QuickGig | null>(null);
  const [apps, setApps] = useState<AppRow[]>([]);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<{ text: string; type: "error" | "info" | "success" } | null>(null);

  useEffect(() => {
    if (!ready) return;
    if (!userId || role === "guest") { router.replace(`/login?next=/firma/brzi-angazman/${gigId}`); return; }
    if (role !== "company" && role !== "admin") { router.replace("/profil"); return; }
    setEmail(authEmail || "");

    async function load() {
      const supabase = createBrowserSupabase();
      // Gig — RLS ensures only owner/admin can read non-active gigs
      const { data: gigData, error: gigErr } = await supabase
        .from("quick_gigs")
        .select("*,professions(id,name,slug,icon),companies(id,name,slug)")
        .eq("id", gigId)
        .maybeSingle();
      if (gigErr) { logError("FirmaGigApps.gig", gigErr); }
      setGig(gigData as QuickGig | null);

      // Applications with candidate profile info (RLS: only gig owner/admin can read)
      const { data: appData, error: appErr } = await supabase
        .from("quick_gig_applications")
        .select("*,profiles(full_name,email,phone)")
        .eq("gig_id", gigId)
        .order("created_at", { ascending: false });
      if (appErr) { logError("FirmaGigApps.apps", appErr); setNotice({ text: safeMessage(appErr, "load"), type: "error" }); }
      setApps((appData ?? []) as AppRow[]);
      setLoading(false);
    }
    load();
  }, [ready, userId, role, authEmail, gigId, router]);

  if (!ready || loading) {
    return (
      <div className="app-shell">
        <div className="loading-panel" style={{ gridColumn: "1/-1" }}><p>Učitavanje...</p></div>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <DashboardSideNav role={role === "admin" ? "admin" : "company"} email={email} />
      <main className="app-main">
        <div className="section-head">
          <div>
            <span className="page-label">Brzi angažman</span>
            <h1>Prijave na angažman</h1>
            {gig && <p className="sub">{gig.title} · {gig.city} · {gigStatusLabels[gig.status]}</p>}
          </div>
          <Link className="btn ghost sm" href="/firma/brzi-angazman">← Nazad</Link>
        </div>

        {notice && <p className={`notice ${notice.type}`} style={{ marginBottom: 14 }}>{notice.text}</p>}

        {!gig ? (
          <div className="bp-empty"><strong>Angažman nije pronađen</strong></div>
        ) : apps.length === 0 ? (
          <div className="bp-empty">
            <strong>Još nema prijava</strong>
            <p>Kad se kandidat prijavi, vidjećeš njegove podatke ovdje.</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div className="kicker">{apps.length} {apps.length === 1 ? "prijava" : "prijava"}</div>
            {apps.map(a => (
              <div key={a.id} className="form-card" style={{ padding: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", marginBottom: 8 }}>
                  <strong style={{ fontSize: 15, overflowWrap: "anywhere" }}>
                    {a.profiles?.full_name || "Kandidat"}
                  </strong>
                  <span style={{ fontSize: 12, color: "var(--muted)" }}>{formatDate(a.created_at, { withTime: true })}</span>
                </div>
                {a.message && (
                  <p style={{ fontSize: 14, lineHeight: 1.6, margin: "0 0 10px", overflowWrap: "anywhere" }}>{a.message}</p>
                )}
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, paddingTop: 8, borderTop: "1px solid var(--line)" }}>
                  {a.profiles?.email && (
                    <a className="btn ghost sm" href={`mailto:${a.profiles.email}`}>✉️ {a.profiles.email}</a>
                  )}
                  {a.profiles?.phone && (
                    <a className="btn blue sm" href={`tel:${a.profiles.phone}`}>📞 {a.profiles.phone}</a>
                  )}
                  {!a.profiles?.email && !a.profiles?.phone && (
                    <span style={{ fontSize: 12, color: "var(--muted)" }}>Kandidat nije ostavio kontakt u profilu.</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
