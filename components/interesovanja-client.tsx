"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { createBrowserSupabase } from "@/lib/supabase/client";
import { safeMessage, logError } from "@/lib/errors";
import { jobTypeOptions } from "@/lib/labels";
import type { Profession, CandidateInterests, LookupItem } from "@/types/domain";

export function InteresovanjaClient() {
  const { userId, ready, role } = useAuth();
  const router = useRouter();

  const [professions, setProfessions] = useState<Profession[]>([]);
  const [categories, setCategories] = useState<LookupItem[]>([]);
  const [selectedProf, setSelectedProf] = useState<number[]>([]);
  const [selectedCats, setSelectedCats] = useState<number[]>([]);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [cities, setCities] = useState("");
  const [minPay, setMinPay] = useState("");
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<{ text: string; type: "info" | "error" | "success" } | null>(null);

  useEffect(() => {
    if (!ready) return;
    if (!userId || role === "guest") {
      router.replace("/login?next=/profil/interesovanja");
      return;
    }

    async function load() {
      const supabase = createBrowserSupabase();
      const [profRes, catRes, intRes] = await Promise.all([
        supabase.from("professions").select("id,name,slug,icon,sort,active").eq("active", true).order("sort"),
        supabase.from("categories").select("id,name,slug").order("name"),
        supabase.from("candidate_interests").select("*").eq("user_id", userId!).maybeSingle(),
      ]);
      setProfessions((profRes.data || []) as Profession[]);
      setCategories((catRes.data || []) as LookupItem[]);
      const it = intRes.data as CandidateInterests | null;
      if (it) {
        setSelectedProf(it.professions || []);
        setSelectedCats(it.categories || []);
        setSelectedTypes(it.job_types || []);
        setCities((it.cities || []).join(", "));
        setMinPay(it.min_daily_pay ? String(it.min_daily_pay) : "");
        setEmailEnabled(it.email_enabled);
      }
      setLoading(false);
    }
    load();
  }, [ready, userId, role, router]);

  function toggleProf(id: number) {
    setSelectedProf(prev => prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]);
  }
  function toggleCat(id: number) {
    setSelectedCats(prev => prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]);
  }
  function toggleType(value: string) {
    setSelectedTypes(prev => prev.includes(value) ? prev.filter(t => t !== value) : [...prev, value]);
  }

  const citiesArr = cities.split(",").map(c => c.trim()).filter(Boolean);
  const hasAnyInterest = selectedProf.length > 0 || selectedCats.length > 0 || citiesArr.length > 0;

  async function save() {
    if (!userId) return;
    // Validation: must pick at least one interest before enabling email
    if (emailEnabled && !hasAnyInterest) {
      setNotice({ text: "Izaberi bar jedno zanimanje, kategoriju ili grad prije uključivanja emaila.", type: "error" });
      return;
    }
    setSaving(true);
    setNotice(null);

    const row = {
      user_id: userId,
      professions: selectedProf,
      cities: citiesArr,
      categories: selectedCats,
      job_types: selectedTypes,
      min_daily_pay: minPay ? Number(minPay) : null,
      email_enabled: emailEnabled,
      email_frequency: "weekly",
      updated_at: new Date().toISOString(),
    };

    const supabase = createBrowserSupabase();
    const { error } = await supabase.from("candidate_interests").upsert(row, { onConflict: "user_id" });
    if (error) {
      logError("Interesovanja.save", error);
      setNotice({ text: safeMessage(error, "save"), type: "error" });
    } else {
      setNotice({ text: "Interesovanja su sačuvana. Dobićeš nedjeljni email sa odgovarajućim poslovima.", type: "success" });
    }
    setSaving(false);
  }

  if (!ready || loading) return <div className="empty"><strong>Učitavanje...</strong></div>;

  return (
    <section style={{ maxWidth: 720, margin: "0 auto", padding: "16px 0" }}>
      <div className="section-head">
        <div>
          <span className="page-label">Brzi poslovi</span>
          <h1>Obavještenja za poslove</h1>
          <p className="sub">Izaberi šta te zanima — šaljemo ti nedjeljni email sa aktivnim poslovima.</p>
        </div>
      </div>

      <div className="notice-card" style={{ marginBottom: 16 }}>
        <strong>Šta je ovo?</strong>
        <p>Odaberi zanimanja, gradove i tip posla. Jednom nedjeljno šaljemo email sa aktivnim poslovima i brzim angažmanima koji odgovaraju tvom izboru. Bez spama, isključuješ kad hoćeš.</p>
      </div>

      <div className="form-card">
        <div className="kicker" style={{ marginBottom: 8 }}>Zanimanja</div>
        <div className="bp-professions" style={{ flexWrap: "wrap", overflowX: "visible" }}>
          {professions.map(p => (
            <button
              key={p.id}
              type="button"
              onClick={() => toggleProf(p.id)}
              className={`bp-prof-chip${selectedProf.includes(p.id) ? " active" : ""}`}
            >
              {p.icon && <span className="bp-prof-chip__icon" aria-hidden>{p.icon}</span>}
              {p.name}
            </button>
          ))}
        </div>

        <label style={{ marginTop: 12 }}>
          <span className="label">Gradovi (odvoji zarezom)</span>
          <input className="field" value={cities} onChange={e => setCities(e.target.value)} placeholder="npr. Podgorica, Budva, Tivat" />
        </label>

        {categories.length > 0 && (
          <>
            <div className="kicker" style={{ margin: "12px 0 8px" }}>Kategorije klasičnih oglasa</div>
            <div className="bp-professions" style={{ flexWrap: "wrap", overflowX: "visible" }}>
              {categories.map(c => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => toggleCat(c.id)}
                  className={`bp-prof-chip${selectedCats.includes(c.id) ? " active" : ""}`}
                >
                  {c.name}
                </button>
              ))}
            </div>
          </>
        )}

        <div className="kicker" style={{ margin: "12px 0 8px" }}>Tip posla</div>
        <div className="bp-professions" style={{ flexWrap: "wrap", overflowX: "visible" }}>
          {jobTypeOptions.map(t => (
            <button
              key={t.value}
              type="button"
              onClick={() => toggleType(t.value)}
              className={`bp-prof-chip${selectedTypes.includes(t.value) ? " active" : ""}`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <label style={{ marginTop: 12 }}>
          <span className="label">Minimalna dnevnica (EUR, opciono)</span>
          <input className="field" type="number" min="0" value={minPay} onChange={e => setMinPay(e.target.value)} placeholder="npr. 50" />
        </label>

        <label className="checkbox-row" style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 14 }}>
          <input type="checkbox" checked={emailEnabled} onChange={e => setEmailEnabled(e.target.checked)} />
          <span>Želim nedjeljni email sa poslovima za moja interesovanja</span>
        </label>

        {/* Preview */}
        {hasAnyInterest && (
          <div className="notice-card" style={{ marginTop: 12, background: "color-mix(in srgb,var(--blue) 6%,var(--paper))" }}>
            <strong style={{ fontSize: 13 }}>Na osnovu ovoga dobijaćeš poslove za:</strong>
            <p style={{ fontSize: 13, color: "var(--muted)", marginTop: 4, lineHeight: 1.6, overflowWrap: "anywhere" }}>
              {[
                selectedProf.length ? professions.filter(p => selectedProf.includes(p.id)).map(p => p.name).join(", ") : null,
                selectedCats.length ? categories.filter(c => selectedCats.includes(c.id)).map(c => c.name).join(", ") : null,
                citiesArr.length ? citiesArr.join(", ") : null,
                minPay ? `dnevnica preko ${minPay}€` : null,
              ].filter(Boolean).join(" · ")}
            </p>
          </div>
        )}

        <button className="btn blue" onClick={save} disabled={saving} style={{ marginTop: 14 }}>
          {saving ? "Čuvanje..." : "Sačuvaj interesovanja"}
        </button>
        {notice && <p className={`notice ${notice.type}`} style={{ marginTop: 12 }}>{notice.text}</p>}
      </div>
    </section>
  );
}
