"use client";

/**
 * CompanyDashboard — extracted "dashboard" view from CompanyClient.
 *
 * This component uses CompanyShell (via useCompany hook) for shared state.
 * All new company sub-pages should use this pattern instead of CompanyClient.
 *
 * Migration status: Dashboard view uses CompanyContext.
 * Remaining views (jobs, new-job, billing) still use CompanyClient internally.
 * Full migration is tracked in the refactor backlog.
 */

import Link from "next/link";
import { useState } from "react";
import { useCompany } from "@/lib/company-context";
import { DashboardSideNav } from "@/components/dashboard-side-nav";
import { ImageUpload } from "@/components/image-upload";
import { createBrowserSupabase } from "@/lib/supabase/client";
import { safeMessage, logError } from "@/lib/errors";
import { slugify } from "@/lib/format";

export function CompanyDashboard() {
  const {
    company, jobs, applications, orders, activePlan,
    email, userId, notice, setCompany, setMsg, setNotice, reload,
  } = useCompany();

  const [saving, setSaving] = useState(false);
  const supabase = createBrowserSupabase();

  const noticeEl = notice
    ? <p className={`notice ${notice.type}`} style={{ marginTop: 12 }}>{notice.text}</p>
    : null;

  async function updateLogo(newPath: string) {
    if (!company?.id) throw new Error("Logo se može uploadovati nakon kreiranja profila firme.");
    const { error } = await supabase.from("companies").update({ logo_path: newPath || null }).eq("id", company.id);
    if (error) { logError("CompanyDashboard.updateLogo", error); throw error; }
    setCompany({ ...company, logo_path: newPath || null });
  }

  async function saveCompany(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setNotice(null);
    if (!userId) { setSaving(false); return; }
    const fd = new FormData(e.currentTarget);
    const name = String(fd.get("name") || "").trim();
    if (!name) { setMsg("Upiši naziv firme.", "error"); setSaving(false); return; }
    const row = {
      owner_id: userId,
      name,
      slug: company?.slug || `${slugify(name)}-${userId.slice(0, 8)}`,
      city: String(fd.get("city") || "").trim(),
      industry: String(fd.get("industry") || "").trim(),
      website: String(fd.get("website") || "").trim() || null,
      description: String(fd.get("description") || "").trim(),
    };
    const result = company
      ? await supabase.from("companies").update(row).eq("id", company.id)
      : await supabase.from("companies").insert(row);
    if (result.error) {
      logError("CompanyDashboard.save", result.error);
      setMsg(safeMessage(result.error, "save"), "error");
    } else {
      setMsg(company ? "Profil firme je sačuvan." : "Profil firme je kreiran i čeka odobrenje.", "success");
      await reload();
    }
    setSaving(false);
  }

  return (
    <div className="app-shell">
      <DashboardSideNav role="company" email={email} displayName={company?.name ?? null} />
      <main className="app-main">
        <div className="section-head">
          <div>
            <span className="page-label">Firma</span>
            <h1>{company?.name || "Pregled firme"}</h1>
            <p className="sub">Profil firme, oglasi i prijave.</p>
          </div>
          <div className="head-actions">
            <Link className="btn blue" href="/firma/novi-oglas">+ Novi oglas</Link>
          </div>
        </div>

        {/* Metrics */}
        <div className="dash-grid">
          <div className="metric"><strong>{jobs.filter(j => j.status === "active").length}</strong><span>Aktivnih oglasa</span></div>
          <div className="metric"><strong>{applications.length}</strong><span>Ukupno prijava</span></div>
          <div className="metric"><strong>{orders.filter(o => o.status === "pending").length}</strong><span>Pending uplate</span></div>
          <div className="metric">
            <strong>{activePlan ? activePlan.plan_name : "—"}</strong>
            <span>{activePlan?.is_active ? "Aktivan plan" : "Bez plana"}</span>
          </div>
        </div>

        {/* Šta želiš da uradiš? — glavne namjere firme */}
        <div className="kicker" style={{ marginBottom: 8 }}>Šta želiš da uradiš?</div>
        <div className="grid three" style={{ marginBottom: 16 }}>
          <Link className="quick-link" href="/firma/novi-oglas">
            <strong>Objavi oglas za posao</strong>
            <span>Za stalne, sezonske ili duže pozicije. Kandidati šalju prijave i pratiš ih kroz selekciju.</span>
          </Link>
          <Link className="quick-link" href="/firma/radnici">
            <strong>⚡ Nađi radnika odmah</strong>
            <span>Pregledaj dostupne konobare, molere, hostese i druge radnike za kratak angažman.</span>
          </Link>
          <Link className="quick-link" href="/firma/brzi-angazman">
            <strong>⚡ Objavi hitan angažman</strong>
            <span>Objavi kratak posao i primi prijave kandidata.</span>
          </Link>
        </div>

        {/* Pomoćne akcije */}
        <div className="grid three" style={{ marginBottom: 16 }}>
          <Link className="quick-link" href="/firma/selekcija"><strong>🗂 Selekcija (ATS)</strong><span>{applications.length} prijava</span></Link>
          <Link className="quick-link" href="/firma/pretplata"><strong>💳 Plan i uplate</strong><span>Upravljaj pretplatom</span></Link>
          <Link className="quick-link" href="/firma/baneri"><strong>📣 Reklame</strong><span>Promoviši firmu</span></Link>
        </div>

        {/* Approval status notice */}
        {!company ? (
          <div className="notice-card warn">
            <strong>Profil firme nije kreiran</strong>
            <p>Popuni podatke o firmi da bi mogao objavljivati oglase.</p>
          </div>
        ) : company.approved ? (
          <div className="notice-card" style={{ background: "color-mix(in srgb,var(--lime) 12%,var(--paper))", border: "2px solid color-mix(in srgb,var(--lime) 40%,var(--line))", marginBottom: 12 }}>
            <strong style={{ color: "var(--ink)" }}>✓ Firma odobrena</strong>
            <p style={{ color: "var(--muted)", marginTop: 2 }}>Vaš profil je aktivan. Možete objavljivati oglase.</p>
          </div>
        ) : (
          <div className="notice-card warn">
            <strong>⏳ Profil firme čeka odobrenje</strong>
            <p style={{ marginTop: 4 }}>Admin pregleda profil i aktivira ga. Obično traje 24h radnim danima.</p>
            <ul style={{ marginTop: 8, paddingLeft: 18, fontSize: 13, color: "var(--muted)", lineHeight: 2 }}>
              <li>✓ Popunite profil firme u potpunosti (ime, grad, opis, logo)</li>
              <li>⌛ Sačekajte admin odobrenje — dobit ćete notifikaciju</li>
              <li>📋 Nakon odobrenja možete kreirati oglase i naručiti paket</li>
            </ul>
          </div>
        )}

        {/* Profile form */}
        <form className="form-card" onSubmit={saveCompany}>
          <div className="kicker" style={{ marginBottom: 4 }}>Profil firme</div>
          {company?.id && userId && (
            <div style={{ marginBottom: 8 }}>
              <span className="label">Logo firme</span>
              <ImageUpload
                bucket="company-logos"
                ownerUserId={userId}
                currentPath={company.logo_path || null}
                fallbackText={company.name || "Firma"}
                shape="rounded"
                size={88}
                onUploaded={updateLogo}
              />
            </div>
          )}
          <label><span className="label">Naziv firme</span><input className="field" name="name" defaultValue={company?.name || ""} required /></label>
          <div className="form-grid">
            <label><span className="label">Grad</span><input className="field" name="city" defaultValue={company?.city || ""} /></label>
            <label><span className="label">Djelatnost</span><input className="field" name="industry" defaultValue={company?.industry || ""} /></label>
          </div>
          <label><span className="label">Website (opciono)</span><input className="field" name="website" type="url" placeholder="https://" defaultValue={company?.website || ""} /></label>
          <label><span className="label">Opis firme</span><textarea className="textarea" name="description" defaultValue={company?.description || ""} /></label>
          <button className="btn blue" disabled={saving}>{saving ? "Čuvanje..." : "Sačuvaj profil firme"}</button>
          {noticeEl}
        </form>
      </main>
    </div>
  );
}
