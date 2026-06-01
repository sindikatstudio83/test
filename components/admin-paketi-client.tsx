"use client";

import { useRouter } from "next/navigation";

import { DashboardSideNav } from "@/components/dashboard-side-nav";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { createBrowserSupabase } from "@/lib/supabase/client";
import { logError, safeMessage } from "@/lib/errors";

// ── Types ────────────────────────────────────────────────────────────────────
type Plan = {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  price_eur: number;
  active_jobs: number;
  unlock_credits: number;
  features: string[];
  is_active?: boolean;
  display_order?: number;
  is_recommended?: boolean;
};

type PlanForm = Omit<Plan, "id"> & { id?: number };

const EMPTY_FORM: PlanForm = {
  name: "",
  slug: "",
  description: "",
  price_eur: 0,
  active_jobs: 1,
  unlock_credits: 0,
  features: [],
  is_active: true,
  display_order: 0,
  is_recommended: false,
};

// ── Side nav (same pattern as AdminClient) ───────────────────────────────────
// SideNav replaced by DashboardSideNav (see components/dashboard-side-nav.tsx)

// ── Plan card preview ────────────────────────────────────────────────────────
function PlanPreviewCard({ form }: { form: PlanForm }) {
  return (
    <div className="plan-card" style={{ maxWidth: 280 }}>
      {form.is_recommended && (
        <div className="featured-badge">Preporučeno ★</div>
      )}
      <div className="plan-name">{form.name || "Naziv paketa"}</div>
      <div className="plan-price">
        <strong>{form.price_eur === 0 ? "Besplatno" : `${form.price_eur} €`}</strong>
        {form.price_eur > 0 && <span>/mj</span>}
      </div>
      {form.description && (
        <p className="plan-desc">{form.description}</p>
      )}
      <ul className="plan-features">
        {(form.features.filter(Boolean)).map((f, i) => (
          <li key={i}>✓ {f}</li>
        ))}
        <li>📋 {form.active_jobs} {form.active_jobs === 1 ? "aktivan oglas" : "aktivnih oglasa"}</li>
        {form.unlock_credits > 0 && <li>🔓 {form.unlock_credits} unlock kredita</li>}
      </ul>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export function AdminPaketiClient() {
  const router = useRouter();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [notice, setNotice] = useState<{ text: string; type: "info" | "error" | "success" } | null>(null);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<PlanForm>(EMPTY_FORM);
  const [showForm, setShowForm] = useState(false);
  const [featureInput, setFeatureInput] = useState("");
  const [preview, setPreview] = useState(false);
  const supabase = createBrowserSupabase();

  function setMsg(text: string, type: "info" | "error" | "success" = "info") {
    setNotice({ text, type });
    setTimeout(() => setNotice(null), 5000);
  }

  const guard = useCallback(async (): Promise<boolean> => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) { router.replace("/login?next=/admin/paketi"); return false; }
    setEmail(data.user.email || "");
    const { data: p } = await supabase.from("profiles").select("role").eq("id", data.user.id).maybeSingle();
    if (p?.role !== "admin") { router.replace("/"); return false; }
    return true;
  }, [supabase, router]);

  const load = useCallback(async () => {
    setLoading(true);
    if (!await guard()) return;
    const { data, error } = await supabase
      .from("plans")
      .select("*")
      .order("price_eur");
    if (error) {
      logError("AdminPaketi.load", error);
      setMsg("Greška pri učitavanju paketa.", "error");
    } else {
      setPlans((data || []) as Plan[]);
    }
    setLoading(false);
  }, [guard, supabase]);

  useEffect(() => { load(); }, [load]);

  function openNew() {
    setEditId(null);
    setForm(EMPTY_FORM);
    setFeatureInput("");
    setPreview(false);
    setShowForm(true);
    setNotice(null);
  }

  function openEdit(plan: Plan) {
    setEditId(plan.id);
    setForm({
      name: plan.name,
      slug: plan.slug,
      description: plan.description || "",
      price_eur: plan.price_eur,
      active_jobs: plan.active_jobs,
      unlock_credits: plan.unlock_credits,
      features: [...plan.features],
      is_active: plan.is_active ?? true,
      display_order: plan.display_order ?? 0,
      is_recommended: plan.is_recommended ?? false,
    });
    setFeatureInput("");
    setPreview(false);
    setShowForm(true);
    setNotice(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function cancelForm() {
    setShowForm(false);
    setEditId(null);
    setForm(EMPTY_FORM);
    setNotice(null);
  }

  function updateField<K extends keyof PlanForm>(key: K, value: PlanForm[K]) {
    setForm(f => ({
      ...f,
      [key]: value,
      // Auto-generate slug from name if editing name and slug is empty or auto-generated
      ...(key === "name" && (!f.slug || f.slug === slugify(f.name))
        ? { slug: slugify(value as string) }
        : {})
    }));
  }

  function slugify(text: string): string {
    return text.toLowerCase()
      .replace(/[čć]/g, "c").replace(/[šđ]/g, "s").replace(/ž/g, "z")
      .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  }

  function addFeature() {
    const trimmed = featureInput.trim();
    if (!trimmed) return;
    setForm(f => ({ ...f, features: [...f.features, trimmed] }));
    setFeatureInput("");
  }

  function removeFeature(idx: number) {
    setForm(f => ({ ...f, features: f.features.filter((_, i) => i !== idx) }));
  }

  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!form.name.trim()) { setMsg("Naziv paketa je obavezan.", "error"); return; }
    if (!form.slug.trim()) { setMsg("Slug je obavezan.", "error"); return; }

    setSaving(true);
    setNotice(null);

    const payload = {
      name: form.name.trim(),
      slug: form.slug.trim(),
      description: form.description?.trim() || null,
      price_eur: Number(form.price_eur),
      active_jobs: Number(form.active_jobs),
      unlock_credits: Number(form.unlock_credits),
      features: form.features.filter(Boolean),
      is_active: form.is_active ?? true,
      display_order: Number(form.display_order ?? 0),
      is_recommended: form.is_recommended ?? false,
    };

    let error;
    if (editId) {
      ({ error } = await supabase.from("plans").update(payload).eq("id", editId));
    } else {
      ({ error } = await supabase.from("plans").insert(payload));
    }

    if (error) {
      logError("AdminPaketi.save", error);
      setMsg(safeMessage(error, "save"), "error");
    } else {
      setMsg(editId ? "Paket je ažuriran." : "Paket je kreiran.", "success");
      cancelForm();
      load();
    }
    setSaving(false);
  }

  async function toggleActive(plan: Plan) {
    const newVal = !(plan.is_active ?? true);
    const { error } = await supabase.from("plans").update({ is_active: newVal }).eq("id", plan.id);
    if (error) {
      logError("AdminPaketi.toggleActive", error);
      setMsg("Greška pri promjeni statusa.", "error");
    } else {
      setPlans(prev => prev.map(p => p.id === plan.id ? { ...p, is_active: newVal } : p));
      setMsg(`Paket ${newVal ? "aktiviran" : "deaktiviran"}.`, "success");
    }
  }

  async function deletePlan(id: number) {
    if (!confirm("Briši ovaj paket? Korisnici koji ga koriste zadržavaju pristup.")) return;
    setDeleting(id);
    const { error } = await supabase.from("plans").delete().eq("id", id);
    if (error) {
      logError("AdminPaketi.delete", error);
      setMsg(safeMessage(error, "save"), "error");
    } else {
      setPlans(prev => prev.filter(p => p.id !== id));
      setMsg("Paket je obrisan.", "success");
    }
    setDeleting(null);
  }

  if (loading) {
    return (
      <div className="app-shell">
        <main className="app-main" style={{ padding: 40, textAlign: "center" }}>
          <div className="ats-loading-spinner" />
          <p style={{ marginTop: 14, color: "var(--muted)" }}>Učitavanje paketa...</p>
        </main>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <DashboardSideNav role="admin" email={email} />
      <main className="app-main">

        {/* Header */}
        <div className="section-head">
          <div>
            <span className="page-label">Admin</span>
            <h1>Paketi pretplate</h1>
            <p className="sub">Upravljaj paketima koji su dostupni firmama.</p>
          </div>
          <button className="btn blue" type="button" onClick={openNew} disabled={showForm}>
            + Novi paket
          </button>
        </div>

        {notice && (
          <p className={`notice ${notice.type}`} role="alert" style={{ marginBottom: 16 }}>{notice.text}</p>
        )}

        {/* Form */}
        {showForm && (
          <div className="table-card" style={{ marginBottom: 24, padding: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h2 style={{ fontSize: 22, margin: 0 }}>{editId ? "Uredi paket" : "Novi paket"}</h2>
              <div style={{ display: "flex", gap: 8 }}>
                <button type="button" className="btn ghost sm" onClick={() => setPreview(p => !p)}>
                  {preview ? "Sakrij preview" : "Pregled kartice"}
                </button>
                <button type="button" className="btn ghost sm" onClick={cancelForm}>Otkaži</button>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: preview ? "1fr 300px" : "1fr", gap: 24, alignItems: "start" }}>
              <form onSubmit={save} style={{ display: "grid", gap: 14 }}>
                {/* Basic info */}
                <div className="form-grid">
                  <label>
                    <span className="label">Naziv paketa *</span>
                    <input className="field" value={form.name} onChange={e => updateField("name", e.target.value)} placeholder="npr. Starter, Pro, Enterprise" required />
                  </label>
                  <label>
                    <span className="label">Slug (URL) *</span>
                    <input className="field" value={form.slug} onChange={e => updateField("slug", e.target.value)} placeholder="starter" required pattern="[a-z0-9-]+" />
                    <span className="hint">Samo mala slova, brojevi i crtice</span>
                  </label>
                </div>

                <label>
                  <span className="label">Opis</span>
                  <textarea className="textarea" value={form.description || ""} onChange={e => updateField("description", e.target.value)} placeholder="Kratki opis paketa za prikaz na pricing stranici..." style={{ minHeight: 72 }} />
                </label>

                {/* Pricing */}
                <div className="form-grid">
                  <label>
                    <span className="label">Cijena (€/mj)</span>
                    <input className="field" type="number" min={0} step={0.01} value={form.price_eur} onChange={e => updateField("price_eur", parseFloat(e.target.value) || 0)} placeholder="0" />
                    <span className="hint">0 = besplatno</span>
                  </label>
                  <label>
                    <span className="label">Aktivnih oglasa</span>
                    <input className="field" type="number" min={0} value={form.active_jobs} onChange={e => updateField("active_jobs", parseInt(e.target.value) || 0)} required />
                  </label>
                </div>

                <div className="form-grid">
                  <label>
                    <span className="label">Unlock kredita</span>
                    <input className="field" type="number" min={0} value={form.unlock_credits} onChange={e => updateField("unlock_credits", parseInt(e.target.value) || 0)} />
                    <span className="hint">Za otključavanje kandidata u ATS</span>
                  </label>
                  <label>
                    <span className="label">Redoslijed prikaza</span>
                    <input className="field" type="number" value={form.display_order ?? 0} onChange={e => updateField("display_order", parseInt(e.target.value) || 0)} />
                    <span className="hint">Manji broj = ranije u listi</span>
                  </label>
                </div>

                {/* Flags */}
                <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
                  <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                    <input type="checkbox" checked={form.is_active ?? true} onChange={e => updateField("is_active", e.target.checked)} />
                    <span className="label" style={{ margin: 0 }}>Aktivan (vidljiv korisnicima)</span>
                  </label>
                  <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                    <input type="checkbox" checked={form.is_recommended ?? false} onChange={e => updateField("is_recommended", e.target.checked)} />
                    <span className="label" style={{ margin: 0 }}>Označi kao preporučen</span>
                  </label>
                </div>

                {/* Features */}
                <div>
                  <span className="label">Karakteristike paketa</span>
                  <div style={{ display: "flex", gap: 8, marginTop: 6, marginBottom: 8 }}>
                    <input
                      className="field"
                      value={featureInput}
                      onChange={e => setFeatureInput(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addFeature(); } }}
                      placeholder="npr. ATS pristup, Prioritetna podrška..."
                      style={{ flex: 1 }}
                    />
                    <button type="button" className="btn ghost sm" onClick={addFeature}>Dodaj</button>
                  </div>
                  {form.features.length > 0 && (
                    <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: 4 }}>
                      {form.features.map((f, i) => (
                        <li key={i} style={{ display: "flex", alignItems: "center", gap: 8, background: "var(--soft)", borderRadius: 8, padding: "6px 10px" }}>
                          <span style={{ flex: 1, fontSize: 13 }}>✓ {f}</span>
                          <button type="button" className="btn ghost xs" onClick={() => removeFeature(i)} style={{ color: "var(--red)" }}>×</button>
                        </li>
                      ))}
                    </ul>
                  )}
                  {form.features.length === 0 && (
                    <p className="hint">Nema dodanih karakteristika. Unesi tekst i klikni Dodaj ili pritisni Enter.</p>
                  )}
                </div>

                <div style={{ display: "flex", gap: 10, paddingTop: 8 }}>
                  <button className="btn blue" type="submit" disabled={saving}>
                    {saving ? "Čuvanje..." : editId ? "Sačuvaj izmjene" : "Kreiraj paket"}
                  </button>
                  <button type="button" className="btn ghost" onClick={cancelForm}>Otkaži</button>
                </div>
              </form>

              {preview && (
                <div>
                  <p className="hint" style={{ marginBottom: 10 }}>Pregled kartice:</p>
                  <PlanPreviewCard form={form} />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Plans list */}
        {plans.length === 0 ? (
          <div className="empty" style={{ marginTop: 32 }}>
            <strong>Nema paketa</strong>
            <p>Kreiraj prvi paket pretplate.</p>
            <button className="btn blue sm" type="button" onClick={openNew}>+ Novi paket</button>
          </div>
        ) : (
          <div className="table-card">
            {plans.map(plan => (
              <div key={plan.id} className="table-row" style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 16, padding: "14px 16px", alignItems: "center" }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <strong style={{ fontSize: 15 }}>{plan.name}</strong>
                    {plan.is_recommended && <span className="badge orange">Preporučeno</span>}
                    <span className={`badge ${plan.is_active !== false ? "green" : "gray"}`}>
                      {plan.is_active !== false ? "Aktivan" : "Neaktivan"}
                    </span>
                    <span className="badge gray">/{plan.slug}/</span>
                  </div>
                  <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                    <span className="meta"><strong>{plan.price_eur === 0 ? "Besplatno" : `${plan.price_eur} €/mj`}</strong></span>
                    <span className="meta">{plan.active_jobs} {plan.active_jobs === 1 ? "oglas" : "oglasa"}</span>
                    <span className="meta">{plan.unlock_credits} kredita</span>
                    {plan.features.length > 0 && <span className="meta">{plan.features.length} {plan.features.length === 1 ? "karakteristika" : "karakteristika"}</span>}
                  </div>
                  {plan.description && <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>{plan.description}</p>}
                </div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "flex-end" }}>
                  <button className="btn ghost xs" type="button" onClick={() => openEdit(plan)}>Uredi</button>
                  <button
                    className={`btn xs ${plan.is_active !== false ? "ghost" : "blue"}`}
                    type="button"
                    onClick={() => toggleActive(plan)}
                  >
                    {plan.is_active !== false ? "Deaktiviraj" : "Aktiviraj"}
                  </button>
                  <button
                    className="btn red xs"
                    type="button"
                    onClick={() => deletePlan(plan.id)}
                    disabled={deleting === plan.id}
                  >
                    {deleting === plan.id ? "..." : "Briši"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* SQL note */}
        <div className="notice-card" style={{ marginTop: 24 }}>
          <strong>Napomena</strong>
          <p>Dodavanje kolona <code>is_active</code>, <code>display_order</code> i <code>is_recommended</code> u tabelu <code>plans</code> zahtijeva pokretanje SQL migracije. Pogledaj <code>supabase-packages-migration.sql</code>.</p>
        </div>
      </main>
    </div>
  );
}
