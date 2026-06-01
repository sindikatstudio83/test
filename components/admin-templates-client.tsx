"use client";

import { useRouter } from "next/navigation";

import { DashboardSideNav } from "@/components/dashboard-side-nav";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { createBrowserSupabase } from "@/lib/supabase/client";
import { safeMessage, logError } from "@/lib/errors";
import Link from "next/link";
import type { CreativeTemplate, CreativeTemplateFormat, CreativeTemplatePurpose } from "@/types/domain";

type Notice = { text: string; type: "info" | "error" | "success" };

const FORMATS: CreativeTemplateFormat[] = [
  "instagram_post", "instagram_story", "facebook_feed",
  "banner", "square", "vertical", "horizontal"
];
const PURPOSES: CreativeTemplatePurpose[] = [
  "job_ad", "featured_job", "paid_top", "company_promo", "quick_job", "generic"
];
const FORMAT_LABELS: Record<CreativeTemplateFormat, string> = {
  instagram_post: "Instagram Post", instagram_story: "Instagram Story",
  facebook_feed: "Facebook Feed", banner: "Web Banner",
  square: "Kvadratni", vertical: "Vertikalni", horizontal: "Horizontalni"
};
const PURPOSE_LABELS: Record<CreativeTemplatePurpose, string> = {
  job_ad: "Oglas za posao", featured_job: "Istaknuti oglas",
  paid_top: "Top pozicija", company_promo: "Promo firme",
  quick_job: "Brzi posao", generic: "Opšte"
};

const emptyForm = { name: "", template_url: "", format: FORMATS[0], purpose: PURPOSES[0] };

// SideNav replaced by DashboardSideNav (see components/dashboard-side-nav.tsx)

export function AdminTemplatesClient() {
  const router = useRouter();
  const { role, ready } = useAuth();
  const supabase = createBrowserSupabase();
  const [templates, setTemplates] = useState<CreativeTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<CreativeTemplate | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [filterFormat, setFilterFormat] = useState("");
  const [filterPurpose, setFilterPurpose] = useState("");
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

    let q = supabase.from("creative_templates").select("*").order("created_at", { ascending: false });
    if (filterFormat) q = q.eq("format", filterFormat as CreativeTemplateFormat);
    if (filterPurpose) q = q.eq("purpose", filterPurpose as CreativeTemplatePurpose);

    const { data, error } = await q;
    if (error) { logError("AdminTemplates.load", error); setNotice({ type: "error", text: safeMessage(error, "load") }); }
    else setTemplates((data || []) as CreativeTemplate[]);
    setLoading(false);
  }

  function startCreate() {
    setEditing(null);
    setForm(emptyForm);
    setShowForm(true);
  }

  function startEdit(t: CreativeTemplate) {
    setEditing(t);
    setForm({ name: t.name, template_url: t.template_url, format: t.format, purpose: t.purpose });
    setShowForm(true);
  }

  async function handleSave() {
    if (!form.name.trim() || !form.template_url.trim()) {
      setNotice({ type: "error", text: "Naziv i URL su obavezni." });
      return;
    }
    setSaving(true);
    const { error } = editing
      ? await supabase.from("creative_templates").update(form).eq("id", editing.id)
      : await supabase.from("creative_templates").insert(form);

    setSaving(false);
    if (error) { logError("AdminTemplates.save", error); setNotice({ type: "error", text: safeMessage(error, "save") }); }
    else { setNotice({ type: "success", text: editing ? "Template ažuriran." : "Template dodan." }); setShowForm(false); setEditing(null); load(); }
  }

  async function toggleActive(t: CreativeTemplate) {
    await supabase.from("creative_templates").update({ active: !t.active }).eq("id", t.id);
    load();
  }

  async function handleDelete(id: number) {
    if (!confirm("Obrisati template?")) return;
    await supabase.from("creative_templates").delete().eq("id", id);
    load();
  }

  return (
    <div className="app-shell">
      <DashboardSideNav role="admin" email={email} />
      <main className="app-main">
        <div className="section-head">
          <div>
            <span className="page-label">Kreativni materijali</span>
            <h1>Canva Templates</h1>
            <p className="sub">Linkovi na Canva template za promociju oglasa na društvenim mrežama.</p>
          </div>
          <button className="btn blue sm" onClick={startCreate}>+ Dodaj template</button>
        </div>

        {/* Filteri */}
        <div className="admin-filters">
          <select value={filterFormat} onChange={e => { setFilterFormat(e.target.value); setTimeout(load, 50); }}>
            <option value="">Svi formati</option>
            {FORMATS.map(f => <option key={f} value={f}>{FORMAT_LABELS[f]}</option>)}
          </select>
          <select value={filterPurpose} onChange={e => { setFilterPurpose(e.target.value); setTimeout(load, 50); }}>
            <option value="">Svi ciljevi</option>
            {PURPOSES.map(p => <option key={p} value={p}>{PURPOSE_LABELS[p]}</option>)}
          </select>
          {(filterFormat || filterPurpose) && (
            <button className="btn ghost xs" onClick={() => { setFilterFormat(""); setFilterPurpose(""); setTimeout(load, 50); }}>✕ Reset</button>
          )}
        </div>

        {/* Form */}
        {showForm && (
          <div className="form-card" style={{ marginBottom: 20, maxWidth: 580 }}>
            <h3>{editing ? "Izmijeni template" : "Novi template"}</h3>
            <div className="form-grid">
              <div>
                <label className="hint">Naziv *</label>
                <input
                  type="text" value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  style={{ width: "100%", background: "var(--soft)", border: "2px solid var(--line2)", borderRadius: 10, padding: "8px 12px", fontWeight: 700 }}
                />
              </div>
              <div>
                <label className="hint">Canva URL *</label>
                <input
                  type="url" value={form.template_url}
                  onChange={e => setForm(f => ({ ...f, template_url: e.target.value }))}
                  placeholder="https://www.canva.com/..."
                  style={{ width: "100%", background: "var(--soft)", border: "2px solid var(--line2)", borderRadius: 10, padding: "8px 12px", fontWeight: 700 }}
                />
              </div>
              <div>
                <label className="hint">Format</label>
                <select value={form.format} onChange={e => setForm(f => ({ ...f, format: e.target.value as CreativeTemplateFormat }))}
                  style={{ width: "100%", background: "var(--soft)", border: "2px solid var(--line2)", borderRadius: 10, padding: "8px 12px", fontWeight: 700 }}>
                  {FORMATS.map(f => <option key={f} value={f}>{FORMAT_LABELS[f]}</option>)}
                </select>
              </div>
              <div>
                <label className="hint">Cilj / Purpose</label>
                <select value={form.purpose} onChange={e => setForm(f => ({ ...f, purpose: e.target.value as CreativeTemplatePurpose }))}
                  style={{ width: "100%", background: "var(--soft)", border: "2px solid var(--line2)", borderRadius: 10, padding: "8px 12px", fontWeight: 700 }}>
                  {PURPOSES.map(p => <option key={p} value={p}>{PURPOSE_LABELS[p]}</option>)}
                </select>
              </div>
            </div>
            {notice && <p className={`notice ${notice.type}`}>{notice.text}</p>}
            <div className="actions">
              <button className="btn ghost sm" onClick={() => { setShowForm(false); setEditing(null); }}>Odustani</button>
              <button className="btn blue sm" disabled={saving} onClick={handleSave}>{saving ? "Čuvanje..." : "Sačuvaj"}</button>
            </div>
          </div>
        )}

        {!showForm && notice && <p className={`notice ${notice.type}`} style={{ marginBottom: 14 }}>{notice.text}</p>}

        {/* Template kartice */}
        {loading && <div className="empty"><strong>Učitavanje...</strong></div>}
        {!loading && templates.length === 0 && (
          <div className="empty">
            <strong>Nema templatea</strong>
            <p>Dodaj prvi Canva template klikom na dugme + Dodaj template.</p>
          </div>
        )}
        {!loading && templates.length > 0 && (
          <div className="template-grid">
            {templates.map(t => (
              <div key={t.id} className={`template-card${!t.active ? " template-card--inactive" : ""}`}>
                <span className="template-card__name">{t.name}</span>
                <div className="template-card__pills">
                  <span className="badge blue">{FORMAT_LABELS[t.format as CreativeTemplateFormat]}</span>
                  <span className="badge gray">{PURPOSE_LABELS[t.purpose as CreativeTemplatePurpose]}</span>
                  {!t.active && <span className="badge gray">Neaktivan</span>}
                </div>
                <div className="template-card__actions">
                  <a href={t.template_url} target="_blank" rel="noopener noreferrer" className="btn ghost xs">↗ Otvori</a>
                  <button className="btn ghost xs" onClick={() => startEdit(t)}>✏ Izmijeni</button>
                  <button className="btn ghost xs" onClick={() => toggleActive(t)}>{t.active ? "⊘ Deaktiviraj" : "✓ Aktiviraj"}</button>
                  <button className="btn red xs" onClick={() => handleDelete(t.id)}>✕ Briši</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
