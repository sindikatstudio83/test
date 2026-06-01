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
import type { Profession, QuickGig, Company } from "@/types/domain";

export function BrziAngazmanClient() {
  const { userId, email: authEmail, ready, role } = useAuth();
  const router = useRouter();

  const [professions, setProfessions] = useState<Profession[]>([]);
  const [gigs, setGigs] = useState<QuickGig[]>([]);
  const [company, setCompany] = useState<Company | null>(null);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<{ text: string; type: "info" | "error" | "success" } | null>(null);

  useEffect(() => {
    if (!ready) return;
    if (!userId || role === "guest") {
      router.replace("/login?next=/firma/brzi-angazman");
      return;
    }
    if (role !== "company" && role !== "admin") {
      router.replace("/profil");
      return;
    }
    setEmail(authEmail || "");

    async function load() {
      const supabase = createBrowserSupabase();
      const [profRes, coRes, gigsRes] = await Promise.all([
        supabase.from("professions").select("id,name,slug,icon,sort,active").eq("active", true).order("sort"),
        supabase.from("companies").select("*").eq("owner_id", userId!).order("created_at").limit(1),
        supabase.from("quick_gigs").select("*,professions(id,name,slug,icon)").eq("posted_by", userId!).order("created_at", { ascending: false }),
      ]);
      setProfessions((profRes.data || []) as Profession[]);
      setCompany(((coRes.data || []) as Company[])[0] || null);
      setGigs((gigsRes.data || []) as QuickGig[]);
      setLoading(false);
    }
    load();
  }, [ready, userId, role, authEmail, router]);

  function setMsg(text: string, type: "info" | "error" | "success" = "info") {
    setNotice({ text, type });
  }

  async function createGig(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!userId) return;
    setSaving(true);
    setNotice(null);

    const fd = new FormData(e.currentTarget);
    const title = String(fd.get("title") || "").trim();
    const professionId = Number(fd.get("profession_id")) || null;
    const city = String(fd.get("city") || "").trim();
    const gigTiming = String(fd.get("gig_timing") || "").trim() || null;
    const gigDate = String(fd.get("gig_date") || "").trim() || null;
    const payText = String(fd.get("pay_text") || "").trim() || null;
    const description = String(fd.get("description") || "").trim() || null;
    const isUrgent = fd.get("is_urgent") === "on";

    if (!title) { setMsg("Upiši naslov angažmana.", "error"); setSaving(false); return; }
    if (!city) { setMsg("Upiši grad.", "error"); setSaving(false); return; }

    const supabase = createBrowserSupabase();
    const { error } = await supabase.from("quick_gigs").insert({
      posted_by: userId,
      company_id: company?.id || null,
      title,
      profession_id: professionId,
      city,
      gig_timing: gigTiming,
      gig_date: gigDate,
      pay_text: payText,
      description,
      is_urgent: isUrgent,
      status: "pending_review",
    });

    if (error) {
      logError("BrziAngazman.create", error);
      setMsg(safeMessage(error, "submit"), "error");
    } else {
      setMsg("Angažman je poslat na odobrenje.", "success");
      (e.target as HTMLFormElement).reset();
      const { data } = await supabase.from("quick_gigs").select("*,professions(id,name,slug,icon)").eq("posted_by", userId).order("created_at", { ascending: false });
      setGigs((data || []) as QuickGig[]);
    }
    setSaving(false);
  }

  async function closeGig(id: number) {
    const supabase = createBrowserSupabase();
    const { error } = await supabase.from("quick_gigs").update({ status: "closed" }).eq("id", id);
    if (!error) {
      setGigs(gs => gs.map(g => g.id === id ? { ...g, status: "closed" } : g));
    }
  }

  if (!ready || loading) {
    return (
      <div className="app-shell">
        <div className="loading-panel" style={{ gridColumn: "1/-1" }}><p>Učitavanje...</p></div>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <DashboardSideNav role="company" email={email} displayName={company?.name ?? null} />
      <main className="app-main">
        <div className="section-head">
          <div>
            <span className="page-label">Brzi poslovi</span>
            <h1>Brzi angažman</h1>
            <p className="sub">Objavi kratak posao — konobar za večeras, hostesa za event, pomoćni radnik...</p>
          </div>
        </div>

        {notice && <p className={`notice ${notice.type}`} style={{ marginBottom: 14 }}>{notice.text}</p>}

        {/* Create form */}
        <form className="form-card" onSubmit={createGig} style={{ marginBottom: 24 }}>
          <label><span className="label">Naslov angažmana *</span>
            <input className="field" name="title" placeholder="npr. Potreban konobar za vikend" required />
          </label>
          <div className="form-grid">
            <label><span className="label">Zanimanje</span>
              <select className="select" name="profession_id" defaultValue="">
                <option value="">Izaberi zanimanje</option>
                {professions.map(p => <option key={p.id} value={p.id}>{p.icon ? `${p.icon} ` : ""}{p.name}</option>)}
              </select>
            </label>
            <label><span className="label">Grad *</span>
              <input className="field" name="city" placeholder="npr. Budva" required />
            </label>
          </div>
          <div className="form-grid">
            <label><span className="label">Kada (tekst)</span>
              <input className="field" name="gig_timing" placeholder="npr. danas, vikend, sjutra uveče" />
            </label>
            <label><span className="label">Datum (opciono)</span>
              <input className="field" name="gig_date" type="date" />
            </label>
          </div>
          <label><span className="label">Naknada</span>
            <input className="field" name="pay_text" placeholder="npr. 60€/dan ili po dogovoru" />
          </label>
          <label><span className="label">Opis</span>
            <textarea className="textarea" name="description" rows={3} placeholder="Detaljniji opis posla..." />
          </label>
          <label className="checkbox-row" style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input type="checkbox" name="is_urgent" />
            <span>Označi kao hitno</span>
          </label>
          <button className="btn blue" disabled={saving} style={{ marginTop: 8 }}>
            {saving ? "Slanje..." : "Objavi angažman →"}
          </button>
        </form>

        {/* My gigs */}
        <div className="kicker" style={{ marginBottom: 10 }}>Moji angažmani ({gigs.length})</div>
        {gigs.length === 0 ? (
          <div className="bp-empty"><strong>Još nema objavljenih angažmana</strong></div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {gigs.map(g => (
              <div key={g.id} className="form-card" style={{ padding: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                  <div style={{ minWidth: 0 }}>
                    <strong style={{ display: "block", overflowWrap: "anywhere" }}>{g.title}</strong>
                    <span style={{ fontSize: 12, color: "var(--muted)" }}>
                      {g.city}{g.gig_timing ? ` · ${g.gig_timing}` : ""}{g.pay_text ? ` · ${g.pay_text}` : ""}
                    </span>
                  </div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", flexShrink: 0 }}>
                    <span className={`status-badge ${g.status === "active" ? "stage-hired" : "stage-review"}`}>
                      {gigStatusLabels[g.status]}
                    </span>
                    <Link className="btn ghost sm" href={`/firma/brzi-angazman/${g.id}`}>Prijave</Link>
                    {g.status === "active" && (
                      <button className="btn ghost sm" onClick={() => closeGig(g.id)}>Zatvori</button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div style={{ marginTop: 20 }}>
          <Link className="btn ghost sm" href="/firma/radnici">Pregledaj dostupne radnike →</Link>
        </div>
      </main>
    </div>
  );
}
