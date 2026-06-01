"use client";

import { useRouter } from "next/navigation";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { createBrowserSupabase } from "@/lib/supabase/client";
import { logError, safeMessage } from "@/lib/errors";
import type { JobAlert, LookupItem } from "@/types/domain";

export function JobAlertsClient() {
  const router = useRouter();
  const { userId, role, ready } = useAuth();
  const [alerts, setAlerts] = useState<JobAlert[]>([]);
  const [cities, setCities] = useState<LookupItem[]>([]);
  const [categories, setCategories] = useState<LookupItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!ready) return;
    if (!userId || role === "guest") { router.replace("/login?next=/profil/upozorenja"); return; }
    if (role !== "candidate" && role !== "admin") { router.replace("/profil"); return; }

    const supabase = createBrowserSupabase();
    Promise.all([
      supabase.from("job_alerts").select("*,cities(id,name),categories(id,name)").eq("candidate_id", userId).order("created_at", { ascending: false }),
      supabase.from("cities").select("id,name,slug").order("name"),
      supabase.from("categories").select("id,name,slug").order("name")
    ]).then(([a, c1, c2]) => {
      if (a.error) logError("JobAlerts.load", a.error);
      setAlerts((a.data || []) as JobAlert[]);
      setCities((c1.data || []) as LookupItem[]);
      setCategories((c2.data || []) as LookupItem[]);
      setLoading(false);
    });
  }, [ready, userId, role, router]);

  async function create(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!userId) return;
    setSaving(true);
    setError("");

    const fd = new FormData(e.currentTarget);
    const cityId = fd.get("city_id") ? Number(fd.get("city_id")) : null;
    const categoryId = fd.get("category_id") ? Number(fd.get("category_id")) : null;
    const contractType = String(fd.get("contract_type") || "").trim() || null;
    const keywords = String(fd.get("keywords") || "").trim() || null;

    if (!cityId && !categoryId && !contractType && !keywords) {
      setError("Postavi makar jedan kriterijum za upozorenje.");
      setSaving(false);
      return;
    }

    const supabase = createBrowserSupabase();
    const { data, error } = await supabase
      .from("job_alerts")
      .insert({ candidate_id: userId, city_id: cityId, category_id: categoryId, contract_type: contractType, keywords })
      .select("*,cities(id,name),categories(id,name)")
      .single();

    if (error) {
      logError("JobAlerts.create", error);
      setError(safeMessage(error, "save"));
      setSaving(false);
      return;
    }

    setAlerts([data as JobAlert, ...alerts]);
    (e.target as HTMLFormElement).reset();
    setSaving(false);
  }

  async function toggleActive(alert: JobAlert) {
    const supabase = createBrowserSupabase();
    const { error } = await supabase.from("job_alerts").update({ active: !alert.active }).eq("id", alert.id);
    if (error) { logError("JobAlerts.toggle", error); return; }
    setAlerts(alerts.map(a => a.id === alert.id ? { ...a, active: !a.active } : a));
  }

  async function remove(id: number) {
    const supabase = createBrowserSupabase();
    await supabase.from("job_alerts").delete().eq("id", id);
    setAlerts(alerts.filter(a => a.id !== id));
  }

  if (!ready || loading) return <div className="panel loading-panel"><p>Učitavanje...</p></div>;

  return (
    <section>
      <div className="section-head">
        <div>
          <span className="page-label">Kandidat</span>
          <h1>Upozorenja za nove oglase</h1>
          <p className="sub">Postavi kriterijume i pratiš nove oglase koji ti odgovaraju.</p>
        </div>
        <Link className="btn ghost" href="/profil">← Dashboard</Link>
      </div>

      <div className="notice" style={{ marginBottom: 16 }}>
        ⏳ <strong>Uskoro:</strong> Email obavještenja su u pripremi. Upozorenja možeš kreirati već sada — notifikacije aktiviramo u narednoj verziji.
      </div>

      <form className="form-card" onSubmit={create} style={{ marginBottom: 18 }}>
        <div className="kicker" style={{ marginBottom: 8 }}>Novo upozorenje</div>
        <div className="form-grid">
          <label>
            <span className="label">Grad</span>
            <select className="field" name="city_id">
              <option value="">— bilo koji —</option>
              {cities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </label>
          <label>
            <span className="label">Kategorija</span>
            <select className="field" name="category_id">
              <option value="">— bilo koja —</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </label>
        </div>
        <div className="form-grid">
          <label>
            <span className="label">Tip ugovora</span>
            <input className="field" name="contract_type" placeholder="npr. puno, sezonski, honorarno" />
          </label>
          <label>
            <span className="label">Ključne riječi</span>
            <input className="field" name="keywords" placeholder="npr. konobar, recepcija" />
          </label>
        </div>
        <button className="btn blue" disabled={saving} type="submit">
          {saving ? "Čuvanje..." : "Sačuvaj upozorenje"}
        </button>
        {error && <p className="notice error" role="alert">{error}</p>}
      </form>

      <div className="table-card">
        {!alerts.length && (
          <div className="empty">
            <strong>Nema postavljenih upozorenja</strong>
            <p>Postavi prvo upozorenje iz forme iznad.</p>
          </div>
        )}
        {alerts.map(a => (
          <div className="table-row" key={a.id}>
            <div>
              <strong>
                {a.cities?.name || "Svi gradovi"} · {a.categories?.name || "Sve kategorije"}
              </strong>
              <small>
                {[a.contract_type, a.keywords].filter(Boolean).join(" · ") || "—"}
              </small>
            </div>
            <div>
              <span className={`badge ${a.active ? "green" : "gray"}`}>
                {a.active ? "Aktivno" : "Pauzirano"}
              </span>
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <button className="btn ghost sm" onClick={() => toggleActive(a)} type="button">
                {a.active ? "Pauziraj" : "Aktiviraj"}
              </button>
              <button className="btn ghost sm" onClick={() => remove(a.id)} type="button">Obriši</button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
