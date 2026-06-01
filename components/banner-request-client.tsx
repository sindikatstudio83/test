"use client";

import { useRouter } from "next/navigation";

import { DashboardSideNav } from "@/components/dashboard-side-nav";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { createBrowserSupabase } from "@/lib/supabase/client";
import { safeMessage, logError } from "@/lib/errors";
import Link from "next/link";
import { placementLabels } from "@/lib/banner-constants";
import { ImageUpload } from "@/components/image-upload";
import { supabaseUrl } from "@/lib/supabase/config";
import type { BannerRequest, BannerPlacement } from "@/types/domain";

type Notice = { text: string; type: "info" | "error" | "success" };

const STATUS_LABELS: Record<string, { label: string; badge: string }> = {
  pending:  { label: "Na čekanju",  badge: "badge orange" },
  approved: { label: "Odobreno",    badge: "badge blue"   },
  rejected: { label: "Odbijeno",    badge: "badge red"    },
  active:   { label: "Aktivan",     badge: "badge green"  },
  expired:  { label: "Istekao",     badge: "badge gray"   },
};

const emptyForm = {
  title: "",
  target_url: "",
  requested_placement: "homepage_top" as BannerPlacement,
  requested_device: "all" as "all" | "desktop" | "mobile",
  requested_start_date: "",
  requested_end_date: "",
  note: "",
};

// SideNav replaced by DashboardSideNav (see components/dashboard-side-nav.tsx)

export function BannerRequestClient() {
  const router = useRouter();
  const { role, userId, email: authEmail, ready } = useAuth();
  const supabase = createBrowserSupabase();
  const [companyId, setCompanyId] = useState<number | null>(null);
  const [companyName, setCompanyName] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [requests, setRequests] = useState<BannerRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [imagePath, setImagePath] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);

  useEffect(() => {
    if (!ready) return;
    if (!userId || (role !== "company" && role !== "admin")) {
      router.replace("/login?next=/firma/baneri");
      return;
    }
    setEmail(authEmail || "");
    init();
  }, [ready]); // eslint-disable-line react-hooks/exhaustive-deps

  async function init() {
    const { data: co } = await supabase.from("companies").select("id,name").eq("owner_id", userId).maybeSingle();
    if (!co) { setLoading(false); return; }
    setCompanyId(co.id);
    setCompanyName(co.name);
    await loadRequests(co.id);
    setLoading(false);
  }

  async function loadRequests(coId?: number) {
    const id = coId || companyId;
    if (!id) return;
    const { data } = await supabase
      .from("banner_requests")
      .select("*")
      .eq("company_id", id)
      .order("created_at", { ascending: false });
    setRequests((data || []) as BannerRequest[]);
  }

  async function handleSubmit() {
    if (!form.title.trim()) { setNotice({ type: "error", text: "Naziv kampanje je obavezan." }); return; }
    if (!companyId) return;

    setSaving(true);
    setNotice(null);
    const { error } = await supabase.from("banner_requests").insert({
      ...form,
      company_id: companyId,
      image_path: imagePath,
      status: "pending",
      created_by: userId,   // FIX: needed for RLS WITH CHECK policy
    });
    setSaving(false);

    if (error) {
      logError("BannerRequest.submit", error);
      setNotice({ type: "error", text: safeMessage(error, "submit") });
    } else {
      setNotice({ type: "success", text: "Zahtjev je poslan! Admin će ga pregledati uskoro." });
      setShowForm(false);
      setForm(emptyForm);
      setImagePath(null);
      loadRequests();
    }
  }

  if (loading) return (
    <div className="app-shell">
      <DashboardSideNav role="company" email={email} displayName={companyName} />
      <main className="app-main"><div className="empty"><strong>Učitavanje...</strong></div></main>
    </div>
  );

  return (
    <div className="app-shell">
      <DashboardSideNav role="company" email={email} displayName={companyName} />
      <main className="app-main">
        <div className="section-head">
          <div>
            <span className="page-label">Reklame</span>
            <h1>Banner zahtjevi</h1>
            <p className="sub">Pošaljite zahtjev za prikazivanje banner reklame na platformi.</p>
          </div>
          <button className="btn blue sm" onClick={() => setShowForm(!showForm)}>
            {showForm ? "Zatvori" : "+ Novi zahtjev"}
          </button>
        </div>

        {/* Forma */}
        {showForm && (
          <div className="banner-req-form">
            <h3 style={{ margin: 0 }}>Novi banner zahtjev</h3>
            <p className="sub" style={{ margin: 0 }}>
              Popunite formu. Naš tim će pregledati zahtjev i kontaktirati vas.
            </p>
            <div className="banner-req-grid">
              <div>
                <label className="hint">Naziv kampanje *</label>
                <input
                  type="text" value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="npr. Ljetna kampanja 2026"
                  style={{ width: "100%", background: "var(--soft)", border: "2px solid var(--line2)", borderRadius: 10, padding: "8px 12px", fontWeight: 700 }}
                />
              </div>
              <div>
                <label className="hint">Link na koji vodi banner</label>
                <input
                  type="url" value={form.target_url}
                  onChange={e => setForm(f => ({ ...f, target_url: e.target.value }))}
                  placeholder="https://"
                  style={{ width: "100%", background: "var(--soft)", border: "2px solid var(--line2)", borderRadius: 10, padding: "8px 12px", fontWeight: 700 }}
                />
              </div>
              <div>
                <label className="hint">Željeni placement</label>
                <select
                  value={form.requested_placement}
                  onChange={e => setForm(f => ({ ...f, requested_placement: e.target.value as BannerPlacement }))}
                  style={{ width: "100%", background: "var(--soft)", border: "2px solid var(--line2)", borderRadius: 10, padding: "8px 12px", fontWeight: 700 }}
                >
                  {Object.entries(placementLabels).map(([v, label]) => (
                    <option key={v} value={v}>{label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="hint">Uređaj</label>
                <select
                  value={form.requested_device}
                  onChange={e => setForm(f => ({ ...f, requested_device: e.target.value as "all" | "desktop" | "mobile" }))}
                  style={{ width: "100%", background: "var(--soft)", border: "2px solid var(--line2)", borderRadius: 10, padding: "8px 12px", fontWeight: 700 }}
                >
                  <option value="all">Sve platforme</option>
                  <option value="desktop">Samo desktop</option>
                  <option value="mobile">Samo mobilni</option>
                </select>
              </div>
              <div>
                <label className="hint">Datum početka</label>
                <input type="date" value={form.requested_start_date}
                  onChange={e => setForm(f => ({ ...f, requested_start_date: e.target.value }))}
                  style={{ width: "100%", background: "var(--soft)", border: "2px solid var(--line2)", borderRadius: 10, padding: "8px 12px", fontWeight: 700 }}
                />
              </div>
              <div>
                <label className="hint">Datum kraja</label>
                <input type="date" value={form.requested_end_date}
                  onChange={e => setForm(f => ({ ...f, requested_end_date: e.target.value }))}
                  style={{ width: "100%", background: "var(--soft)", border: "2px solid var(--line2)", borderRadius: 10, padding: "8px 12px", fontWeight: 700 }}
                />
              </div>
              {/* Image/creative upload */}
              <div style={{ gridColumn: "1/-1" }}>
                <label className="hint" style={{ marginBottom: 6, display: "block" }}>Kreativ / banner slika (opcionalno)</label>
                {userId && companyId && (
                  <ImageUpload
                    bucket="banners"
                    ownerUserId={userId}
                    currentPath={imagePath}
                    fallbackText="Banner"
                    shape="rounded"
                    size={72}
                    onUploaded={(path) => setImagePath(path)}
                  />
                )}
                {imagePath && (
                  <div style={{ marginTop: 8 }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`${supabaseUrl}/storage/v1/object/public/banners/${imagePath}`}
                      alt="Preview kreativa"
                      style={{ maxHeight: 120, maxWidth: "100%", borderRadius: 10, border: "2px solid var(--line2)" }}
                    />
                    <button
                      type="button"
                      className="btn ghost xs"
                      style={{ marginLeft: 8 }}
                      onClick={() => setImagePath(null)}
                    >Ukloni sliku</button>
                  </div>
                )}
                <p className="hint" style={{ marginTop: 4 }}>
                  JPG, PNG, WebP do 5MB. Preporučeno: 970×250px za leaderboard, 300×600px za tower.
                </p>
              </div>

              <div style={{ gridColumn: "1/-1" }}>
                <label className="hint">Napomena (posebni zahtjevi...)</label>
                <textarea
                  value={form.note}
                  onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
                  rows={3}
                  style={{ width: "100%", background: "var(--soft)", border: "2px solid var(--line2)", borderRadius: 10, padding: "8px 12px", fontWeight: 700 }}
                />
              </div>
            </div>
            <p className="muted" style={{ fontSize: 12 }}>
              * Sliku banera dostavite administratoru nakon odobrenja.
              Preporučene dimenzije: Leaderboard 728×90px, Billboard 970×250px, Tower 300×600px.
            </p>
            {notice && showForm && <p className={`notice ${notice.type}`}>{notice.text}</p>}
            <div className="actions">
              <button className="btn ghost sm" onClick={() => setShowForm(false)}>Odustani</button>
              <button className="btn blue sm" disabled={saving} onClick={handleSubmit}>
                {saving ? "Slanje..." : "Pošalji zahtjev"}
              </button>
            </div>
          </div>
        )}

        {notice && !showForm && <p className={`notice ${notice.type}`} style={{ marginBottom: 14 }}>{notice.text}</p>}

        {/* Lista zahtjeva */}
        {requests.length === 0 && !loading ? (
          <div className="empty">
            <strong>Nema zahtjeva</strong>
            <p>Pošaljite prvi zahtjev za banner reklamu.</p>
          </div>
        ) : (
          <div className="banner-req-list">
            {requests.map(r => {
              const s = STATUS_LABELS[r.status] || { label: r.status, badge: "badge gray" };
              return (
                <div key={r.id} className="banner-req-row">
                  <div style={{ flex: 1 }}>
                    <strong style={{ fontSize: 14 }}>{r.title}</strong>
                    {r.requested_placement && (
                      <span className="banner-req-row__meta">
                        {" · "}{placementLabels[r.requested_placement as BannerPlacement] || r.requested_placement}
                      </span>
                    )}
                  </div>
                  <span className={s.badge}>{s.label}</span>
                  {r.admin_note && (
                    <small style={{ color: "var(--muted)", width: "100%" }}>Admin: {r.admin_note}</small>
                  )}
                  <small className="banner-req-row__meta">
                    {new Date(r.created_at).toLocaleDateString("sr-ME")}
                  </small>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
