"use client";

import { useRouter } from "next/navigation";

import { DashboardSideNav } from "@/components/dashboard-side-nav";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { createBrowserSupabase } from "@/lib/supabase/client";
import { safeMessage, logError } from "@/lib/errors";
import { supabaseUrl } from "@/lib/supabase/config";
import Link from "next/link";
import type { BannerRequest, BannerRequestStatus } from "@/types/domain";

type Row = BannerRequest & { companies?: { id: number; name: string } | null };
type Notice = { text: string; type: "info" | "error" | "success" };

const STATUS_LABELS: Record<BannerRequestStatus, { label: string; badge: string }> = {
  pending:  { label: "Na čekanju", badge: "badge orange" },
  approved: { label: "Odobreno",   badge: "badge blue"   },
  rejected: { label: "Odbijeno",   badge: "badge red"    },
  active:   { label: "Aktivan",    badge: "badge green"  },
  expired:  { label: "Istekao",    badge: "badge gray"   },
};

// SideNav replaced by DashboardSideNav (see components/dashboard-side-nav.tsx)

export function AdminBannerRequestsClient() {
  const router = useRouter();
  const { role, ready } = useAuth();
  const supabase = createBrowserSupabase();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [filterStatus, setFilterStatus] = useState("");
  const [acting, setActing] = useState<number | null>(null);
  const [selected, setSelected] = useState<Row | null>(null);
  const [adminNote, setAdminNote] = useState("");
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

    const q = supabase
      .from("banner_requests")
      .select("*,companies(id,name)")
      .order("created_at", { ascending: false });

    const { data, error } = filterStatus ? await q.eq("status", filterStatus as BannerRequestStatus) : await q;
    if (error) { logError("AdminBannerRequests.load", error); setNotice({ type: "error", text: safeMessage(error, "load") }); }
    else setRows((data || []) as Row[]);
    setLoading(false);
  }

  async function updateStatus(id: number, status: BannerRequestStatus, note?: string) {
    setActing(id);
    const { error } = await supabase
      .from("banner_requests")
      .update({ status, admin_note: note || null, reviewed_at: new Date().toISOString() })
      .eq("id", id);
    setActing(null);
    if (error) { logError("BannerReq.update", error); setNotice({ type: "error", text: safeMessage(error, "save") }); }
    else { setNotice({ type: "success", text: "Status ažuriran." }); setSelected(null); setAdminNote(""); load(); }
  }

  return (
    <div className="app-shell">
      <DashboardSideNav role="admin" email={email} />
      <main className="app-main">
        <div className="section-head">
          <div>
            <span className="page-label">Reklamni prostor</span>
            <h1>Banner zahtjevi</h1>
            <p className="sub">Zahtjevi firmi za banner reklame.</p>
          </div>
        </div>

        <div className="admin-filters">
          <select value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setTimeout(() => load(), 50); }}>
            <option value="">Svi statusi</option>
            {Object.entries(STATUS_LABELS).map(([v, { label }]) => <option key={v} value={v}>{label}</option>)}
          </select>
          {filterStatus && <button className="btn ghost xs" onClick={() => { setFilterStatus(""); setTimeout(load, 50); }}>✕ Reset</button>}
        </div>

        {/* Detalj panel */}
        {selected && (
          <div style={{ background: "var(--soft)", border: "2px solid var(--line2)", borderRadius: 16, padding: "16px 20px", marginBottom: 16, display: "grid", gap: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <strong>{selected.title}</strong>
              <button className="btn ghost xs" onClick={() => setSelected(null)}>✕</button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, fontSize: 13 }}>
              <p><b>Firma:</b> {selected.companies?.name}</p>
              <p><b>Placement:</b> {selected.requested_placement || "—"}</p>
              <p><b>Uređaj:</b> {selected.requested_device}</p>
              <p><b>Period:</b> {selected.requested_start_date} – {selected.requested_end_date}</p>
              {selected.target_url && <p style={{ gridColumn: "1/-1" }}><b>URL:</b> <a href={selected.target_url} target="_blank" rel="noopener noreferrer" style={{ color: "var(--blue)" }}>{selected.target_url}</a></p>}
              {selected.note && <p style={{ gridColumn: "1/-1" }}><b>Napomena firme:</b> {selected.note}</p>}
              {selected.image_path && (
                <div style={{ gridColumn: "1/-1" }}>
                  <b>Kreativ:</b>
                  <div style={{ marginTop: 6 }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={selected.image_path.startsWith("http")
                        ? selected.image_path
                        : `${supabaseUrl}/storage/v1/object/public/banners/${selected.image_path}`}
                      alt="Banner kreativ"
                      style={{ maxHeight: 160, maxWidth: "100%", borderRadius: 10, border: "2px solid var(--line2)" }}
                    />
                  </div>
                </div>
              )}
            </div>
            <div>
              <label className="hint" style={{ marginBottom: 4, display: "block" }}>Admin napomena</label>
              <textarea value={adminNote} onChange={e => setAdminNote(e.target.value)} rows={2} style={{ width: "100%", background: "var(--paper)", border: "2px solid var(--line2)", borderRadius: 10, padding: "8px 12px", fontWeight: 700 }} />
            </div>
            <div className="actions">
              <button className="btn blue sm" disabled={acting === selected.id} onClick={() => updateStatus(selected.id, "approved", adminNote)}>✓ Odobri</button>
              <button className="btn lime sm" disabled={acting === selected.id} onClick={() => updateStatus(selected.id, "active", adminNote)}>▶ Aktiviraj</button>
              <button className="btn red sm" disabled={acting === selected.id} onClick={() => updateStatus(selected.id, "rejected", adminNote)}>✗ Odbij</button>
            </div>
          </div>
        )}

        {notice && <p className={`notice ${notice.type}`} style={{ marginBottom: 14 }}>{notice.text}</p>}

        <div className="admin-card-list">
          {loading && <div className="empty"><strong>Učitavanje...</strong></div>}
          {!loading && rows.length === 0 && <div className="empty"><strong>Nema zahtjeva</strong></div>}
          {!loading && rows.map(row => {
            const s = STATUS_LABELS[row.status as BannerRequestStatus] || { label: row.status, badge: "badge gray" };
            return (
              <div className="admin-card" key={row.id}>
                <div className="admin-card-head">
                  <div className="admin-card-avatar">{(row.companies?.name || "?").slice(0, 2).toUpperCase()}</div>
                  <div className="admin-card-info">
                    <strong>{row.title}</strong>
                    <small>{row.companies?.name}</small>
                    <small>{new Date(row.created_at).toLocaleDateString("sr-ME")}</small>
                  </div>
                </div>
                <div className="admin-card-badges">
                  <span className={s.badge}>{s.label}</span>
                  {row.requested_placement && <span className="badge gray">{row.requested_placement}</span>}
                </div>
                <div className="admin-card-actions">
                  <button className="btn ghost xs" onClick={() => { setSelected(row); setAdminNote(row.admin_note || ""); }}>👁 Pregled</button>
                  {row.status === "pending" && <>
                    <button className="btn blue xs" disabled={acting === row.id} onClick={() => updateStatus(row.id, "approved")}>✓ Odobri</button>
                    <button className="btn red xs" disabled={acting === row.id} onClick={() => updateStatus(row.id, "rejected")}>✗ Odbij</button>
                  </>}
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
