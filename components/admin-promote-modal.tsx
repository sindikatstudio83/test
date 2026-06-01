"use client";

import { useState } from "react";
import { createBrowserSupabase } from "@/lib/supabase/client";
import { safeMessage, logError } from "@/lib/errors";
import type { JobPromotion, JobPromotionType, JobPromotionSource } from "@/types/domain";

type Row = Record<string, unknown>;

interface Props {
  job: Row;
  onClose: () => void;
  onSaved: () => void;
}

const TYPES: { value: JobPromotionType; label: string; badge: string }[] = [
  { value: "paid_top",     label: "Top pozicija",  badge: "badge-paid"   },
  { value: "featured",     label: "Istaknuto",     badge: "badge-promo"  },
  { value: "homepage_top", label: "Homepage",      badge: "badge blue"   },
  { value: "urgent",       label: "Hitno",         badge: "badge-urgent" },
];

const SOURCES: { value: JobPromotionSource; label: string }[] = [
  { value: "admin",   label: "Admin" },
  { value: "package", label: "Paket" },
  { value: "payment", label: "Uplata" },
  { value: "credit",  label: "Kredit" },
];

export function AdminPromoteModal({ job, onClose, onSaved }: Props) {
  const supabase = createBrowserSupabase();
  const [promotions, setPromotions] = useState<JobPromotion[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [type, setType] = useState<JobPromotionType>("featured");
  const [priority, setPriority] = useState(0);
  const [source, setSource] = useState<JobPromotionSource>("admin");
  const [startsAt, setStartsAt] = useState(new Date().toISOString().slice(0, 16));
  const [endsAt, setEndsAt] = useState("");
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<{ type: "info" | "error" | "success"; text: string } | null>(null);

  // Učitaj postojeće promocije jednom
  if (!loaded) {
    setLoaded(true);
    supabase
      .from("job_promotions")
      .select("*")
      .eq("job_id", job.id)
      .order("created_at", { ascending: false })
      .then(({ data }: { data: JobPromotion[] | null }) => setPromotions((data || []) as JobPromotion[]));
  }

  async function handleSave() {
    setSaving(true);
    setNotice(null);
    const { error } = await supabase.from("job_promotions").insert({
      job_id: job.id as number,
      company_id: job.company_id as number,
      type,
      priority,
      source,
      status: "active",
      starts_at: new Date(startsAt).toISOString(),
      ends_at: endsAt ? new Date(endsAt).toISOString() : null,
    });
    setSaving(false);
    if (error) {
      logError("AdminPromoteModal.save", error);
      setNotice({ type: "error", text: safeMessage(error, "save") });
    } else {
      setNotice({ type: "success", text: "Promocija sačuvana!" });
      // Reload
      const { data } = await supabase.from("job_promotions").select("*").eq("job_id", job.id).order("created_at", { ascending: false });
      setPromotions((data || []) as JobPromotion[]);
      onSaved();
    }
  }

  async function handleExpire(id: number) {
    await supabase.from("job_promotions").update({ status: "expired" }).eq("id", id);
    setPromotions(prev => prev.map(p => p.id === id ? { ...p, status: "expired" as const } : p));
  }

  return (
    <div className="promote-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="promote-panel">
        <div className="promote-header">
          <span className="promote-title">Promoviši oglas</span>
          <button className="btn ghost xs" onClick={onClose}>✕</button>
        </div>

        <div className="promote-body">
          <p className="muted" style={{ marginTop: 0 }}>{job.title as string}</p>

          {/* Aktivne promocije */}
          {promotions.length > 0 && (
            <div>
              <p className="hint" style={{ marginBottom: 6 }}>Postojeće promocije</p>
              <div className="promo-history">
                {promotions.map(p => {
                  const def = TYPES.find(t => t.value === p.type);
                  return (
                    <div key={p.id} className="promo-history-row">
                      <span className={def?.badge ?? "badge gray"}>{def?.label ?? p.type}</span>
                      <span className="muted">Prioritet: {p.priority} · {p.status}</span>
                      {p.ends_at && (
                        <span className="muted">do {new Date(p.ends_at).toLocaleDateString("sr-ME")}</span>
                      )}
                      {p.status === "active" && (
                        <button className="btn red xs" onClick={() => handleExpire(p.id)}>Ukini</button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Nova promocija */}
          <div>
            <p className="hint" style={{ marginBottom: 8 }}>Dodaj novu promociju</p>
            <div className="promo-type-grid">
              {TYPES.map(t => (
                <button
                  key={t.value}
                  className={`promo-type-btn${type === t.value ? " active" : ""}`}
                  onClick={() => setType(t.value)}
                >
                  <span className={t.badge}>{t.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="form-grid">
            <div>
              <label className="hint">Prioritet (0–100)</label>
              <input
                type="number" min={0} max={100}
                value={priority}
                onChange={e => setPriority(Number(e.target.value))}
                style={{ background: "var(--soft)", border: "2px solid var(--line2)", borderRadius: 10, padding: "8px 12px", width: "100%", fontWeight: 700 }}
              />
            </div>
            <div>
              <label className="hint">Izvor</label>
              <select
                value={source}
                onChange={e => setSource(e.target.value as JobPromotionSource)}
                style={{ background: "var(--soft)", border: "2px solid var(--line2)", borderRadius: 10, padding: "8px 12px", width: "100%", fontWeight: 700 }}
              >
                {SOURCES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
            <div>
              <label className="hint">Datum početka</label>
              <input
                type="datetime-local" value={startsAt}
                onChange={e => setStartsAt(e.target.value)}
                style={{ background: "var(--soft)", border: "2px solid var(--line2)", borderRadius: 10, padding: "8px 12px", width: "100%", fontWeight: 700 }}
              />
            </div>
            <div>
              <label className="hint">Datum kraja (opcionalno)</label>
              <input
                type="datetime-local" value={endsAt}
                onChange={e => setEndsAt(e.target.value)}
                style={{ background: "var(--soft)", border: "2px solid var(--line2)", borderRadius: 10, padding: "8px 12px", width: "100%", fontWeight: 700 }}
              />
            </div>
          </div>

          {notice && <p className={`notice ${notice.type}`}>{notice.text}</p>}
        </div>

        <div className="promote-footer">
          <button className="btn ghost sm" onClick={onClose}>Odustani</button>
          <button className="btn blue sm" disabled={saving} onClick={handleSave}>
            {saving ? "Čuvanje..." : "Sačuvaj promociju"}
          </button>
        </div>
      </div>
    </div>
  );
}
