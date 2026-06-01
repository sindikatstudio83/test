"use client";

import { useRouter } from "next/navigation";

import { DashboardSideNav } from "@/components/dashboard-side-nav";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createBrowserSupabase } from "@/lib/supabase/client";
import { safeMessage, logError } from "@/lib/errors";
import { AdminPromoteModal } from "@/components/admin-promote-modal";

type AdminView = "dashboard" | "jobs" | "users" | "payments" | "companies";
type Row = Record<string, any>; // dynamic Supabase rows
type Notice = { text: string; type: "info" | "error" | "success" };

// SideNav replaced by DashboardSideNav (see components/dashboard-side-nav.tsx)

// ── Job Preview Modal ─────────────────────────────────────────────────────
function JobPreviewModal({ job, onClose }: { job: Row; onClose: () => void }) {
  if (!job) return null;
  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        background: "rgba(0,0,0,0.55)", display: "flex",
        alignItems: "center", justifyContent: "center", padding: 16
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        background: "var(--paper)", borderRadius: 20, maxWidth: 680,
        width: "100%", maxHeight: "85vh", overflow: "auto",
        padding: "28px 28px 32px", position: "relative",
        border: "2px solid var(--line)", boxShadow: "0 20px 60px rgba(0,0,0,0.3)"
      }}>
        <button
          onClick={onClose}
          style={{
            position: "absolute", top: 16, right: 16,
            background: "var(--soft)", border: "none", borderRadius: 8,
            width: 32, height: 32, cursor: "pointer", fontSize: 18,
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "var(--ink)"
          }}
        >×</button>

        {/* Header */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
            {job.companies?.name && (
              <span className="badge blue">{job.companies.name}</span>
            )}
            {job.categories?.name && (
              <span className="badge gray">{job.categories.name}</span>
            )}
            <span className={`badge ${job.status === "active" ? "green" : job.status === "pending_review" ? "orange" : "gray"}`}>
              {job.status === "active" ? "Aktivan" : job.status === "pending_review" ? "Na pregledu" : job.status}
            </span>
            {job.featured && <span className="badge orange">★ Istaknuto</span>}
          </div>
          <h2 style={{ fontSize: 22, fontWeight: 900, margin: "0 0 8px" }}>{job.title}</h2>
          <div style={{ display: "flex", gap: 16, fontSize: 13, color: "var(--muted)", flexWrap: "wrap" }}>
            {job.cities?.name && <span>📍 {job.cities.name}</span>}
            {job.contract_type && <span>📄 {job.contract_type}</span>}
            {job.salary_text && <span>💰 {job.salary_text}</span>}
            {job.deadline && <span>⏰ Rok: {new Date(job.deadline).toLocaleDateString("sr-ME")}</span>}
          </div>
        </div>

        <hr style={{ border: "none", borderTop: "2px solid var(--line)", margin: "16px 0" }} />

        {/* Description */}
        <div style={{ whiteSpace: "pre-line", fontSize: 14, lineHeight: 1.75, color: "var(--ink)" }}>
          {job.description}
        </div>

        {job.requirements && (
          <>
            <hr style={{ border: "none", borderTop: "2px solid var(--line)", margin: "16px 0" }} />
            <h3 style={{ fontSize: 15, fontWeight: 800, marginBottom: 8 }}>Zahtjevi</h3>
            <div style={{ whiteSpace: "pre-line", fontSize: 14, lineHeight: 1.75 }}>
              {job.requirements}
            </div>
          </>
        )}

        <div style={{ marginTop: 20, fontSize: 11, color: "var(--muted)" }}>
          Kreiran: {new Date(job.created_at).toLocaleDateString("sr-ME")} · ID: {job.id}
        </div>
      </div>
    </div>
  );
}

export function AdminClient({ view }: { view: AdminView }) {
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>([]);
  const [stats, setStats] = useState({ jobs: 0, companies: 0, payments: 0, users: 0, revenue: 0 });
  const [notice, setNotice] = useState<Notice | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<number | null>(null);
  const [email, setEmail] = useState("");
  const [previewJob, setPreviewJob] = useState<Row | null>(null);
  const [promoteJob, setPromoteJob] = useState<Row | null>(null);
  const [searchQ, setSearchQ] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [supabase] = useState(() => createBrowserSupabase());

  function setMsg(text: string, type: Notice["type"] = "info") { setNotice({ text, type }); }

  async function guard(): Promise<boolean> {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) { router.replace("/login?next=/admin"); return false; }
    setEmail(data.user.email || "");
    const { data: p } = await supabase.from("profiles").select("role").eq("id", data.user.id).maybeSingle();
    if (p?.role !== "admin") { router.replace("/"); return false; }
    return true;
  }

  async function load() {
    setLoading(true); setNotice(null);
    if (!await guard()) return;

    const [pendingJobs, pendingCos, pendingPay, users, paidOrders] = await Promise.all([
      supabase.from("jobs").select("id", { count: "exact", head: true }).eq("status", "pending_review"),
      supabase.from("companies").select("id", { count: "exact", head: true }).eq("approved", false),
      supabase.from("payment_proofs").select("id", { count: "exact", head: true }).eq("status", "pending"),
      supabase.from("profiles").select("id", { count: "exact", head: true }),
      supabase.from("orders").select("amount_eur").eq("status", "paid")
    ]);
    const revenue = (paidOrders.data || []).reduce((s: number, o: any) => s + (o.amount_eur || 0), 0);
    setStats({ jobs: pendingJobs.count || 0, companies: pendingCos.count || 0, payments: pendingPay.count || 0, users: users.count || 0, revenue });

    let result: any;
    if (view === "dashboard") {
      result = await supabase.from("payment_proofs").select("*,orders(id,payment_reference,amount_eur,status,plans(name)),companies(name)").eq("status", "pending").order("created_at", { ascending: false }).limit(8);
    } else if (view === "users") {
      result = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
    } else if (view === "payments") {
      result = await supabase.from("payment_proofs").select("*,orders(id,payment_reference,amount_eur,status,plans(name)),companies(name)").order("created_at", { ascending: false });
    } else if (view === "companies") {
      result = await supabase.from("companies").select("*").order("created_at", { ascending: false });
    } else {
      result = await supabase.from("jobs").select("*,companies(id,name,slug),categories(id,name),cities(id,name)").order("created_at", { ascending: false });
    }

    setRows(result?.data || []);
    if (result?.error) { logError("AdminClient", result.error); setMsg(safeMessage(result.error, "load"), "error"); }
    setLoading(false);
  }

  useEffect(() => { load(); }, [view]); // eslint-disable-line react-hooks/exhaustive-deps

  async function updateJob(id: number, patch: Record<string, unknown>) {
    setActing(id);
    const { error } = await supabase.from("jobs").update(patch).eq("id", id);
    if (error) { logError("AdminClient", error); setMsg(safeMessage(error, "save"), "error"); } else { setMsg("Oglas ažuriran.", "success"); }
    setActing(null); await load();
  }

  async function deleteJob(id: number) {
    if (!window.confirm("Obriši ovaj oglas? Ova akcija se ne može poništiti.")) return;
    setActing(id);
    const { error } = await supabase.from("jobs").delete().eq("id", id);
    if (error) { logError("AdminClient.deleteJob", error); setMsg(safeMessage(error, "save"), "error"); } else { setMsg("Oglas obrisan.", "success"); }
    setActing(null); await load();
  }


  async function changeUserRole(id: string, newRole: string) {
    if (!window.confirm(`Promijeni rolu korisnika na "${newRole}"?`)) return;
    // Admin-only: direct profiles update is allowed by RLS "admin updates all profiles" policy
    const { error } = await supabase.from("profiles").update({ role: newRole }).eq("id", id);
    if (error) { logError("AdminClient.changeRole", error); setMsg(safeMessage(error, "save"), "error"); }
    else { setMsg(`Rola promijenjena na "${newRole}".`, "success"); }
    await load();
  }

  async function sendPasswordReset(email: string) {
    if (!email) return;
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-lozinka`
    });
    if (error) { logError("AdminClient.resetPw", error); setMsg(safeMessage(error, "save"), "error"); }
    else { setMsg("Reset email poslan.", "success"); }
  }

  async function toggleCompanyRecommended(id: number, current: boolean) {
    setActing(id);
    const { error } = await supabase.from("companies").update({ recommended: !current }).eq("id", id);
    if (error) { logError("AdminClient", error); setMsg(safeMessage(error, "save"), "error"); }
    else { setMsg(!current ? "Firma označena kao preporučena." : "Preporuka uklonjena.", "success"); }
    setActing(null); await load();
  }

  async function updateCompany(id: number, approved?: boolean, recommended?: boolean) {
    setActing(id);
    const patch: Record<string, unknown> = {};
    if (approved !== undefined) patch.approved = approved;
    if (recommended !== undefined) patch.recommended = recommended;
    const { error } = await supabase.from("companies").update(patch).eq("id", id);
    if (error) {
      logError("AdminClient", error);
      setMsg(safeMessage(error, "save"), "error");
    } else {
      setMsg(approved ? "Firma odobrena." : "Firma sakrivena.", "success");
      // Notifikacija vlasniku firme pri odobrenju
      if (approved) {
        const co = rows.find((r: Row) => r.id === id);
        if (co?.owner_id) {
          await supabase.from("notifications").insert({
            recipient_id: co.owner_id,
            title: "Firma odobrena ✓",
            message: `Vaša firma "${co.name}" je odobrena. Sada možete objavljivati oglase.`,
            notification_type: "company_approved",
            link: "/firma",
          });
        }
      }
    }
    setActing(null); await load();
  }

  async function confirmProof(row: Row) {
    if (row.status !== "pending") { setMsg("Dokaz je već obrađen.", "error"); return; }
    setActing(row.id);
    // FIX: RPC očekuje p_proof_id (prethodno pogrešno bilo proof_id)
    const { error } = await supabase.rpc("confirm_payment_proof", { p_proof_id: row.id });
    if (error) { logError("AdminClient.confirmProof", error); setMsg(safeMessage(error, "save"), "error"); } else {
      setMsg("Uplata potvrđena. Paket aktiviran.", "success");
    }
    setActing(null); await load();
  }

  async function rejectProof(id: number) {
    setActing(id);
    const { error } = await supabase.from("payment_proofs").update({ status: "rejected", reviewed_at: new Date().toISOString() }).eq("id", id).eq("status", "pending");
    if (error) { logError("AdminClient", error); setMsg(safeMessage(error, "save"), "error"); } else { setMsg("Dokaz odbijen.", "info"); }
    setActing(null); await load();
  }

  async function openProof(filePath: string) {
    const { data, error } = await supabase.storage.from("payment-proofs").createSignedUrl(filePath, 300);
    if (error || !data?.signedUrl) { logError("AdminClient.signedUrl", error); setMsg(safeMessage(error, "load"), "error"); return; }
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  }

  const viewTitles: Record<AdminView, string> = { dashboard: "Pregled", jobs: "Oglasi", users: "Korisnici", payments: "Uplate", companies: "Firme" };
  const noticeEl = notice ? <p className={`notice ${notice.type}`} style={{ marginTop: 16 }}>{notice.text}</p> : null;

  return (
    <div className="app-shell">
      <DashboardSideNav role="admin" email={email} />
      <main className="app-main">
        <div className="section-head">
          <div><span className="page-label">Upravljanje</span><h1>{viewTitles[view]}</h1><p className="sub">Pregled stavki koje traže provjeru i odluku.</p></div>
        </div>

        {view === "dashboard" && (
          <>
            <div className="dash-grid">
              <div className="metric"><strong>{stats.jobs}</strong><span>Oglasa čeka pregled</span></div>
              <div className="metric" style={stats.payments > 0 ? { background: "var(--orange)" } : {}}><strong>{stats.payments}</strong><span>Uplata čeka potvrdu</span></div>
              <div className="metric"><strong>{stats.companies}</strong><span>Firmi čeka odobrenje</span></div>
              <div className="metric"><strong>{stats.revenue}€</strong><span>Prihod ukupno</span></div>
            </div>
            <div className="grid four" style={{ marginBottom: 20 }}>
              <Link className="quick-link" href="/admin/oglasi"><strong>Oglasi ({stats.jobs})</strong><span>Pregled i moderacija</span></Link>
              <Link className="quick-link" href="/admin/uplate"><strong>Uplate ({stats.payments})</strong><span>Potvrdi plaćanja</span></Link>
              <Link className="quick-link" href="/admin/firme"><strong>Firme ({stats.companies})</strong><span>Odobri poslodavce</span></Link>
              <Link className="quick-link" href="/admin/korisnici"><strong>Korisnici ({stats.users})</strong><span>Pregled svih korisnika</span></Link>
              <Link className="quick-link" href="/admin/baneri"><strong>Baneri</strong><span>Upravljanje reklamama</span></Link>
              <Link className="quick-link" href="/admin/banner-zahtjevi"><strong>Banner zahtjevi</strong><span>Zahtjevi firmi</span></Link>
              <Link className="quick-link" href="/admin/paketi"><strong>Paketi pretplate</strong><span>Kreiraj i uredi pakete</span></Link>
              <Link className="quick-link" href="/admin/templates"><strong>Canva Templates</strong><span>Linkovi za kreative</span></Link>
            </div>
            <div className="section-head compact-head"><div><h2>Uplate koje čekaju potvrdu</h2></div></div>
          </>
        )}

        {/* ── SEARCH + FILTER BAR ──────────────────────────── */}
        {(view === "jobs" || view === "companies" || view === "users") && (
          <div className="admin-filters">
            <input
              placeholder={view === "jobs" ? "Pretraži oglas..." : view === "companies" ? "Pretraži firmu..." : "Pretraži korisnika..."}
              value={searchQ}
              onChange={e => setSearchQ(e.target.value)}
              style={{ flex: 1, minWidth: 180 }}
            />
            {view === "jobs" && (
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                <option value="">Svi statusi</option>
                <option value="active">Aktivan</option>
                <option value="pending_review">Na pregledu</option>
                <option value="paused">Pauziran</option>
                <option value="rejected">Odbijen</option>
                <option value="expired">Istekao</option>
              </select>
            )}
            {view === "companies" && (
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                <option value="">Sve firme</option>
                <option value="approved">Odobrene</option>
                <option value="pending">Na čekanju</option>
                <option value="recommended">Preporučene</option>
              </select>
            )}
            {(searchQ || filterStatus) && (
              <button className="btn ghost xs" onClick={() => { setSearchQ(""); setFilterStatus(""); }}>✕ Reset</button>
            )}
          </div>
        )}

        <div className="admin-card-list">
          {loading && <div className="empty"><strong>Učitavanje...</strong></div>}
          {!loading && rows
            .filter(row => {
              if (!searchQ && !filterStatus) return true;
              const q = searchQ.toLowerCase();
              const matchQ = !searchQ || (
                String(row.title || "").toLowerCase().includes(q) ||
                String(row.name || "").toLowerCase().includes(q) ||
                String(row.email || "").toLowerCase().includes(q) ||
                String(row.full_name || "").toLowerCase().includes(q) ||
                String(row.companies?.name || "").toLowerCase().includes(q)
              );
              const matchStatus = !filterStatus || (
                filterStatus === "approved" ? row.approved === true :
                filterStatus === "pending" ? row.approved === false :
                filterStatus === "recommended" ? row.recommended === true :
                row.status === filterStatus
              );
              return matchQ && matchStatus;
            })
            .map(row => {
            const titleVal = row.title || row.email || row.full_name || row.payment_reference || row.name || row.orders?.payment_reference || row.id;
            const titleStr = String(titleVal || "");
            const subtitleStr = view === "jobs"
              ? `${row.companies?.name || "—"}${row.description ? " · " + String(row.description).slice(0, 50) : ""}`
              : String(row.description || "").slice(0, 60) || row.companies?.name || row.orders?.plans?.name || row.role || row.industry || "";
            return (
              <div className="admin-card" key={row.id}>
                <div className="admin-card-head">
                  <div className="admin-card-avatar">{titleStr.slice(0, 2).toUpperCase()}</div>
                  <div className="admin-card-info">
                    <strong title={titleStr}>{titleStr}</strong>
                    {subtitleStr && <small>{subtitleStr}</small>}
                    {row.created_at && <small style={{ marginTop: 2 }}>{new Date(row.created_at).toLocaleDateString("sr-ME")}</small>}
                  </div>
                  {(row.amount_eur || row.orders?.amount_eur) && (
                    <strong style={{ fontSize: 15, flexShrink: 0, marginLeft: 8 }}>{row.amount_eur || row.orders?.amount_eur} €</strong>
                  )}
                </div>
                <div className="admin-card-badges">
                  {row.role && <span className={`badge ${row.role === "admin" ? "pink" : row.role === "company" ? "blue" : "gray"}`}>{row.role}</span>}
                  {row.approved === false && <span className="badge orange">Čeka odobrenje</span>}
                  {row.approved === true && <span className="badge green">Odobrena</span>}
                  {row.recommended && <span className="badge orange">★ Preporučena</span>}
                  {row.status && !row.approved && !row.role && <span className={`badge ${row.status === "active" ? "green" : row.status === "pending_review" ? "orange" : "gray"}`}>{row.status}</span>}
                  {row.featured && <span className="badge orange">★ Istaknuto</span>}
                </div>
                <div className="admin-card-actions">
                  {view === "jobs" && <>
                    <button className="btn ghost xs" onClick={() => setPreviewJob(row)}>👁 Pregledaj</button>
                    <button className="btn blue xs" disabled={acting === row.id} onClick={() => updateJob(row.id, { status: "active" })}>Odobri</button>
                    <button className="btn red xs" disabled={acting === row.id} onClick={() => updateJob(row.id, { status: "paused" })}>Pauziraj</button>
                    <button className="btn lime xs" disabled={acting === row.id} onClick={() => updateJob(row.id, { featured: !row.featured })}>{row.featured ? "★ Ukloni" : "★ Istakni"}</button>
                    <button className="btn ghost xs" onClick={() => setPromoteJob(row)}>⬆ Promoviši</button>
                    <button className="btn red xs" disabled={acting === row.id} onClick={() => deleteJob(row.id)}>Briši</button>
                  </>}
                  {view === "companies" && <>
                    <button className="btn blue xs" disabled={acting === row.id} onClick={() => updateCompany(row.id, true)}>Odobri</button>
                    <button className="btn red xs" disabled={acting === row.id} onClick={() => updateCompany(row.id, false)}>Sakrij</button>
                    <button className="btn ghost xs" disabled={acting === row.id} onClick={() => toggleCompanyRecommended(row.id, row.recommended)}>{row.recommended ? "★ Ukloni preporuku" : "★ Preporuči"}</button>
                  </>}
                  {view === "users" && <>
                    <select
                      className="btn ghost xs"
                      style={{ cursor: "pointer" }}
                      value=""
                      onChange={e => { if (e.target.value) changeUserRole(String(row.id), e.target.value); }}
                      disabled={acting === row.id}
                      title="Promijeni rolu"
                    >
                      <option value="">Promijeni rolu...</option>
                      <option value="candidate">candidate</option>
                      <option value="company">company</option>
                      <option value="admin">admin</option>
                    </select>
                    {row.email && (
                      <button className="btn ghost xs" onClick={() => sendPasswordReset(row.email)} disabled={acting === row.id}>
                        Reset lozinke
                      </button>
                    )}
                  </>}
                  {(view === "payments" || view === "dashboard") && <>
                    <button className="btn ghost xs" onClick={() => openProof(row.file_path || row.proof_path)}>Otvori dokaz</button>
                    {row.status === "pending" && <>
                      <button className="btn blue xs" disabled={acting === row.id} onClick={() => confirmProof(row)}>Potvrdi</button>
                      <button className="btn red xs" disabled={acting === row.id} onClick={() => rejectProof(row.id)}>Odbij</button>
                    </>}
                    {row.status === "approved" && <span className="badge green">Potvrđeno</span>}
                  </>}
                </div>
              </div>
            );
          })}
          {!loading && !rows.length && <div className="empty"><strong>Nema podataka</strong><p>Podaci će se prikazati kada postoje u bazi.</p></div>}
        </div>
        {noticeEl}

        {/* Job preview modal */}
        {previewJob && <JobPreviewModal job={previewJob} onClose={() => setPreviewJob(null)} />}
        {promoteJob && <AdminPromoteModal job={promoteJob} onClose={() => setPromoteJob(null)} onSaved={() => { setPromoteJob(null); load(); }} />}
      </main>
    </div>
  );
}
