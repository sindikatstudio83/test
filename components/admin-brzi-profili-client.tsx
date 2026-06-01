"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { createBrowserSupabase } from "@/lib/supabase/client";
import { safeMessage, logError } from "@/lib/errors";
import { DashboardSideNav } from "@/components/dashboard-side-nav";
import { Avatar } from "@/components/avatar";
import { formatDate } from "@/lib/format";
import { workerStatusLabels } from "@/lib/labels";
import type { WorkerProfile, WorkerStatus } from "@/types/domain";

type Notice = { text: string; type: "info" | "error" | "success" };

const STATUS_BADGE: Record<WorkerStatus, string> = {
  pending: "badge orange",
  active: "badge green",
  hidden: "badge gray",
  rejected: "badge red",
};

export function AdminBrziProfiliClient() {
  const { role, ready } = useAuth();
  const router = useRouter();
  const supabase = createBrowserSupabase();
  const [rows, setRows] = useState<WorkerProfile[]>([]);
  const [msgCounts, setMsgCounts] = useState<Record<number, number>>({});
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
      .from("worker_profiles")
      .select("*,professions(id,name,slug,icon)")
      .order("created_at", { ascending: false });
    if (filterStatus) q = q.eq("status", filterStatus as WorkerStatus);

    const { data, error } = await q;
    if (error) { logError("AdminBrziProfili.load", error); setNotice({ type: "error", text: safeMessage(error, "load") }); }
    else {
      const list = (data || []) as WorkerProfile[];
      setRows(list);
      // Load message counts per worker (admin can read all via RLS)
      if (list.length) {
        const ids = list.map(w => w.id);
        const { data: msgData } = await supabase
          .from("worker_messages")
          .select("worker_id")
          .in("worker_id", ids);
        const counts: Record<number, number> = {};
        (msgData ?? []).forEach((m: { worker_id: number }) => { counts[m.worker_id] = (counts[m.worker_id] || 0) + 1; });
        setMsgCounts(counts);
      }
    }
    setLoading(false);
  }

  async function setStatus(id: number, status: WorkerStatus) {
    setActing(id);
    const { error } = await supabase.rpc("admin_set_worker_status", { p_worker_id: id, p_status: status });
    if (error) {
      logError("AdminBrziProfili.setStatus", error);
      setNotice({ type: "error", text: safeMessage(error, "save") });
    } else {
      setRows(rs => rs.map(r => r.id === id ? { ...r, status } : r));
      setNotice({ type: "success", text: `Status promijenjen na "${workerStatusLabels[status]}".` });
    }
    setActing(null);
  }

  async function togglePremium(w: WorkerProfile) {
    setActing(w.id);
    const until = w.is_premium ? null : new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString();
    const { error } = await supabase.rpc("admin_set_worker_premium", {
      p_worker_id: w.id, p_premium: !w.is_premium, p_until: until,
    });
    if (error) {
      logError("AdminBrziProfili.premium", error);
      setNotice({ type: "error", text: safeMessage(error, "save") });
    } else {
      setRows(rs => rs.map(r => r.id === w.id ? { ...r, is_premium: !w.is_premium, premium_until: until } : r));
      setNotice({ type: "success", text: !w.is_premium ? "Premium aktiviran (30 dana)." : "Premium uklonjen." });
    }
    setActing(null);
  }

  async function toggleVerified(w: WorkerProfile) {
    setActing(w.id);
    const { error } = await supabase.rpc("admin_set_worker_verified", {
      p_worker_id: w.id, p_verified: !w.is_verified,
    });
    if (error) {
      logError("AdminBrziProfili.verified", error);
      setNotice({ type: "error", text: safeMessage(error, "save") });
    } else {
      setRows(rs => rs.map(r => r.id === w.id ? { ...r, is_verified: !w.is_verified } : r));
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
            <h1>Brzi profili</h1>
            <p className="sub">Moderacija profila radnika — odobri, sakrij, verifikuj, dodijeli premium.</p>
          </div>
        </div>

        {notice && <p className={`notice ${notice.type}`} style={{ marginBottom: 14 }}>{notice.text}</p>}

        <div className="bp-professions" style={{ flexWrap: "wrap", overflowX: "visible", marginBottom: 16 }}>
          {["", "pending", "active", "hidden", "rejected"].map(s => (
            <button key={s || "all"} type="button" onClick={() => setFilterStatus(s)}
              className={`bp-prof-chip${filterStatus === s ? " active" : ""}`}>
              {s ? workerStatusLabels[s as WorkerStatus] : "Svi"}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="empty"><strong>Učitavanje...</strong></div>
        ) : rows.length === 0 ? (
          <div className="bp-empty"><strong>Nema profila za prikaz</strong></div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {rows.map(w => (
              <div key={w.id} className="form-card" style={{ padding: 14 }}>
                <div style={{ display: "flex", gap: 12, alignItems: "flex-start", flexWrap: "wrap" }}>
                  <div style={{ width: 48, height: 48, flexShrink: 0 }}>
                    <Avatar bucket="worker-photos" path={w.photo_path} fallback={w.display_name} size={48} shape="rounded" />
                  </div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                      <strong style={{ overflowWrap: "anywhere" }}>{w.display_name}</strong>
                      <span className={STATUS_BADGE[w.status]}>{workerStatusLabels[w.status]}</span>
                      {w.is_premium && <span className="badge orange">★ Premium</span>}
                      {w.is_verified && <span className="badge blue">✓ Verifikovan</span>}
                    </div>
                    <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>
                      {(w.professions?.name || w.profession_text || "—")} · {w.cities.join(", ") || "—"} · {w.views} pregleda · {formatDate(w.created_at)}
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "var(--blue)", marginTop: 4 }}>
                      {msgCounts[w.id] || 0} {(msgCounts[w.id] || 0) === 1 ? "kontakt" : "kontakata"}
                    </div>
                  </div>
                </div>

                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 12 }}>
                  {w.status !== "active" && (
                    <button className="btn blue sm" disabled={acting === w.id} onClick={() => setStatus(w.id, "active")}>Odobri</button>
                  )}
                  {w.status !== "hidden" && (
                    <button className="btn ghost sm" disabled={acting === w.id} onClick={() => setStatus(w.id, "hidden")}>Sakrij</button>
                  )}
                  {w.status !== "rejected" && (
                    <button className="btn ghost sm" disabled={acting === w.id} onClick={() => setStatus(w.id, "rejected")}>Odbij</button>
                  )}
                  <button className="btn ghost sm" disabled={acting === w.id} onClick={() => togglePremium(w)}>
                    {w.is_premium ? "Ukloni premium" : "Dodijeli premium"}
                  </button>
                  <button className="btn ghost sm" disabled={acting === w.id} onClick={() => toggleVerified(w)}>
                    {w.is_verified ? "Ukloni verifikaciju" : "Verifikuj"}
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
