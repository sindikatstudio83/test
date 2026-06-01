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
import type { QuickGig, GigStatus } from "@/types/domain";

type Notice = { text: string; type: "info" | "error" | "success" };

const STATUS_BADGE: Record<GigStatus, string> = {
  pending_review: "badge orange",
  active: "badge green",
  closed: "badge gray",
  rejected: "badge red",
  expired: "badge gray",
};

export function AdminBrziAngazmaniClient() {
  const { role, ready } = useAuth();
  const router = useRouter();
  const supabase = createBrowserSupabase();
  const [rows, setRows] = useState<QuickGig[]>([]);
  const [appCounts, setAppCounts] = useState<Record<number, number>>({});
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("");
  const [acting, setActing] = useState<number | null>(null);
  const [email, setEmail] = useState("");

  useEffect(() => {
    if (!ready) return;
    if (role !== "admin") { router.replace("/"); return; }
    load();
  }, [ready, role]); // eslint-disable-line react-hooks/exhaustive-deps

  async function load() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) setEmail(user.email || "");

    let q = supabase
      .from("quick_gigs")
      .select("*,professions(id,name,slug,icon),companies(id,name,slug)")
      .order("created_at", { ascending: false });
    if (filterStatus) q = q.eq("status", filterStatus as GigStatus);

    const { data, error } = await q;
    if (error) { logError("AdminBrziAngazmani.load", error); setNotice({ type: "error", text: safeMessage(error, "load") }); }
    else {
      const gigsList = (data || []) as QuickGig[];
      setRows(gigsList);
      // Load application counts per gig
      if (gigsList.length) {
        const ids = gigsList.map(g => g.id);
        const { data: appData } = await supabase
          .from("quick_gig_applications")
          .select("gig_id")
          .in("gig_id", ids);
        const counts: Record<number, number> = {};
        (appData ?? []).forEach((a: { gig_id: number }) => { counts[a.gig_id] = (counts[a.gig_id] || 0) + 1; });
        setAppCounts(counts);
      }
    }
    setLoading(false);
  }

  async function setStatus(id: number, status: GigStatus) {
    setActing(id);
    const { error } = await supabase.rpc("admin_set_gig_status", { p_gig_id: id, p_status: status });
    if (error) {
      logError("AdminBrziAngazmani.setStatus", error);
      setNotice({ type: "error", text: safeMessage(error, "save") });
    } else {
      setRows(rs => rs.map(r => r.id === id ? { ...r, status } : r));
      setNotice({ type: "success", text: `Status promijenjen na "${gigStatusLabels[status]}".` });
    }
    setActing(null);
  }

  async function toggleFeatured(g: QuickGig) {
    setActing(g.id);
    const { error } = await supabase.rpc("admin_set_gig_featured", {
      p_gig_id: g.id, p_featured: !g.is_featured,
    });
    if (error) {
      logError("AdminBrziAngazmani.featured", error);
      setNotice({ type: "error", text: safeMessage(error, "save") });
    } else {
      setRows(rs => rs.map(r => r.id === g.id ? { ...r, is_featured: !g.is_featured } : r));
    }
    setActing(null);
  }

  useEffect(() => { if (ready && role === "admin") load(); }, [filterStatus]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!ready || role !== "admin") return <div className="loading-panel">Provjera pristupa...</div>;

  return (
    <div className="app-shell">
      <DashboardSideNav role="admin" email={email} />
      <main className="app-main">
        <div className="section-head">
          <div>
            <span className="page-label">Admin · Brzi poslovi</span>
            <h1>Brzi angažmani</h1>
            <p className="sub">Odobri ili odbij objave brzih poslova, označi kao istaknuto.</p>
          </div>
        </div>

        {notice && <p className={`notice ${notice.type}`} style={{ marginBottom: 14 }}>{notice.text}</p>}

        <div className="bp-professions" style={{ flexWrap: "wrap", overflowX: "visible", marginBottom: 16 }}>
          {["", "pending_review", "active", "closed", "rejected"].map(s => (
            <button key={s || "all"} type="button" onClick={() => setFilterStatus(s)}
              className={`bp-prof-chip${filterStatus === s ? " active" : ""}`}>
              {s ? gigStatusLabels[s as GigStatus] : "Svi"}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="empty"><strong>Učitavanje...</strong></div>
        ) : rows.length === 0 ? (
          <div className="bp-empty"><strong>Nema angažmana za prikaz</strong></div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {rows.map(g => (
              <div key={g.id} className="form-card" style={{ padding: 14 }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                  <strong style={{ overflowWrap: "anywhere" }}>{g.title}</strong>
                  <span className={STATUS_BADGE[g.status]}>{gigStatusLabels[g.status]}</span>
                  {g.is_urgent && <span className="badge red">Hitno</span>}
                  {g.is_featured && <span className="badge orange">★ Istaknuto</span>}
                </div>
                <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>
                  {(g.professions?.name || "—")} · {g.city}{g.gig_timing ? ` · ${g.gig_timing}` : ""}{g.pay_text ? ` · ${g.pay_text}` : ""} · {g.companies?.name || "Privatni"} · {formatDate(g.created_at)}
                </div>
                <div style={{ fontSize: 12, fontWeight: 700, color: "var(--blue)", marginTop: 4 }}>
                  {appCounts[g.id] || 0} {(appCounts[g.id] || 0) === 1 ? "prijava" : "prijava"}
                </div>

                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 12 }}>
                  <Link className="btn ghost sm" href={`/firma/brzi-angazman/${g.id}`}>Prijave ({appCounts[g.id] || 0})</Link>
                  {g.status !== "active" && (
                    <button className="btn blue sm" disabled={acting === g.id} onClick={() => setStatus(g.id, "active")}>Odobri</button>
                  )}
                  {g.status !== "rejected" && (
                    <button className="btn ghost sm" disabled={acting === g.id} onClick={() => setStatus(g.id, "rejected")}>Odbij</button>
                  )}
                  {g.status !== "closed" && (
                    <button className="btn ghost sm" disabled={acting === g.id} onClick={() => setStatus(g.id, "closed")}>Zatvori</button>
                  )}
                  <button className="btn ghost sm" disabled={acting === g.id} onClick={() => toggleFeatured(g)}>
                    {g.is_featured ? "Ukloni istaknuto" : "Istakni"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
