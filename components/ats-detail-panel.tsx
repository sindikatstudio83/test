"use client";

import Link from "next/link";
import { useEffect, useState, useCallback } from "react";
import { createBrowserSupabase } from "@/lib/supabase/client";
import { logError, safeMessage } from "@/lib/errors";
import { initials, formatDate } from "@/lib/format";
import { stageLabels, ATS_LABEL_OPTS } from "@/lib/labels";
import type { ApplicationComment, ApplicationLabel, ApplicationEvent, JobApplication, CvData } from "@/types/domain";

type ExtProfile = {
  full_name?: string | null;
  email?: string | null;
  phone?: string | null;
  city?: string | null;
  cv_data?: CvData | null;
  cv_updated_at?: string | null;
};

function CvSection({ title, content }: { title: string; content: string | null | undefined }) {
  if (!content?.trim()) return null;
  return (
    <div className="cand-cv-section">
      <div className="cand-cv-section-title">{title}</div>
      <div className="cand-cv-row">{content}</div>
    </div>
  );
}

function SkillTags({ skills }: { skills: string | null | undefined }) {
  if (!skills?.trim()) return null;
  const tags = skills.split(/[,\n]+/).map(s => s.trim()).filter(Boolean);
  return (
    <div className="cand-cv-section">
      <div className="cand-cv-section-title">Vještine</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 4 }}>
        {tags.map(t => <span key={t} className="cand-cv-tag">{t}</span>)}
      </div>
    </div>
  );
}

export function AtsDetailPanel({ application, onClose }: { application: JobApplication; onClose: () => void }) {
  const [comments, setComments] = useState<ApplicationComment[]>([]);
  const [labels, setLabels] = useState<string[]>([]);
  const [events, setEvents] = useState<ApplicationEvent[]>([]);
  const [newComment, setNewComment] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [cvOpen, setCvOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const supabase = createBrowserSupabase();
    const [c, l, e] = await Promise.all([
      supabase.from("application_comments").select("*").eq("application_id", application.id).order("created_at", { ascending: false }),
      supabase.from("application_labels").select("*").eq("application_id", application.id),
      supabase.from("application_events").select("*").eq("application_id", application.id).order("created_at", { ascending: false }).limit(20)
    ]);

    if (c.error) logError("AtsPanel.comments", c.error);
    if (l.error) logError("AtsPanel.labels", l.error);
    if (e.error) logError("AtsPanel.events", e.error);

    setComments((c.data || []) as ApplicationComment[]);
    setLabels(((l.data || []) as ApplicationLabel[]).map(x => x.label));
    setEvents((e.data || []) as ApplicationEvent[]);
    setLoading(false);
  }, [application.id]);

  useEffect(() => { load(); }, [load]);

  async function addComment() {
    const text = newComment.trim();
    if (!text) return;
    setSubmitting(true);
    setError("");

    const supabase = createBrowserSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSubmitting(false); return; }

    const { data, error } = await supabase
      .from("application_comments")
      .insert({ application_id: application.id, author_id: user.id, text })
      .select("*")
      .single();

    if (error) {
      logError("AtsPanel.addComment", error);
      setError(safeMessage(error, "submit"));
      setSubmitting(false);
      return;
    }

    setComments([data as ApplicationComment, ...comments]);
    setNewComment("");
    setSubmitting(false);
  }

  async function toggleLabel(label: typeof ATS_LABEL_OPTS[number]["key"]) {
    const supabase = createBrowserSupabase();
    if (labels.includes(label)) {
      const { error } = await supabase.from("application_labels").delete()
        .eq("application_id", application.id).eq("label", label);
      if (!error) setLabels(labels.filter(l => l !== label));
    } else {
      const { error } = await supabase.from("application_labels").insert({
        application_id: application.id, label
      });
      if (!error) setLabels([...labels, label]);
    }
  }

  const prof = (application as { profiles?: ExtProfile }).profiles;
  const name = prof?.full_name || prof?.email || "Kandidat";
  const cv = prof?.cv_data;

  const hasCv = Boolean(
    cv?.summary || cv?.experience || cv?.education ||
    cv?.skills || cv?.languages || cv?.certificates
  );

  return (
    <div className="ats-detail-panel-body">

      {/* ── PROFIL KANDIDATA ── */}
      <div className="cand-profile-header">
        <div className="cand-profile-av">{initials(name)}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="cand-profile-name">{name}</div>
          {cv?.title && <div className="cand-profile-sub">{cv.title}</div>}
          {prof?.city && !cv?.title && <div className="cand-profile-sub">📍 {prof.city}</div>}
        </div>
        {/* FIX: Link ka punom profilu kandidata — candidate_id iz application objekta */}
        {application.candidate_id && (
          <Link
            href={`/firma/kandidati/${application.candidate_id}`}
            className="btn ghost xs"
            style={{ flexShrink: 0, whiteSpace: "nowrap" }}
            target="_blank"
            rel="noopener noreferrer"
          >
            Puni profil ↗
          </Link>
        )}
      </div>

      {/* Kontakt */}
      <div className="cand-profile-contact" style={{ marginBottom: 12 }}>
        {(prof?.email || cv?.email) && (
          <a href={`mailto:${prof?.email || cv?.email}`}>
            📧 {prof?.email || cv?.email}
          </a>
        )}
        {(prof?.phone || cv?.phone) && (
          <a href={`tel:${prof?.phone || cv?.phone}`}>
            📞 {prof?.phone || cv?.phone}
          </a>
        )}
        {(prof?.city || cv?.city) && (
          <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "5px 10px", background: "var(--soft)", borderRadius: 8, fontSize: 12, color: "var(--muted)" }}>
            📍 {prof?.city || cv?.city}
          </span>
        )}
      </div>

      {/* ── CV TOGGLE ── */}
      {hasCv && (
        <button
          type="button"
          className="btn blue sm"
          style={{ width: "100%", marginBottom: 12, justifyContent: "center" }}
          onClick={() => setCvOpen(o => !o)}
        >
          {cvOpen ? "▲ Sakrij CV" : "📄 Pogledaj CV / Biografiju"}
        </button>
      )}

      {/* ── CV SADRŽAJ ── */}
      {hasCv && cvOpen && (
        <div style={{ background: "var(--soft)", borderRadius: 12, padding: "14px 16px", marginBottom: 14 }}>
          {cv?.summary && (
            <div className="cand-cv-section">
              <div className="cand-cv-section-title">O kandidatu</div>
              <div className="cand-cv-row">{cv.summary}</div>
            </div>
          )}
          <SkillTags skills={cv?.skills} />
          <CvSection title="Iskustvo" content={cv?.experience} />
          <CvSection title="Obrazovanje" content={cv?.education} />
          <CvSection title="Jezici" content={cv?.languages} />
          <CvSection title="Sertifikati" content={cv?.certificates} />
          {cv?.availability && (
            <div className="cand-cv-section">
              <div className="cand-cv-section-title">Dostupnost</div>
              <div>
                <span className="cand-cv-tag" style={{ background: "color-mix(in srgb,var(--green) 12%,transparent)", color: "var(--green)", borderColor: "color-mix(in srgb,var(--green) 20%,transparent)" }}>
                  ✓ {cv.availability}
                </span>
              </div>
            </div>
          )}
          {prof?.cv_updated_at && (
            <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 10, paddingTop: 8, borderTop: "1px solid var(--line)" }}>
              CV ažuriran: {new Date(prof.cv_updated_at).toLocaleDateString("sr-ME")}
            </div>
          )}
        </div>
      )}

      {/* ── PROPRATNI TEKST ── */}
      {application.cover_letter && (
        <div className="soft-card" style={{ marginBottom: 12 }}>
          <div className="label">Propratni tekst prijave</div>
          <p style={{ fontSize: 13, lineHeight: 1.65, margin: "8px 0 0", color: "var(--ink)", fontStyle: "italic" }}>
            &ldquo;{application.cover_letter}&rdquo;
          </p>
        </div>
      )}

      {/* ── OZNAKE ── */}
      <div style={{ marginBottom: 14 }}>
        <div className="label">Oznake</div>
        <div className="label-picker">
          {ATS_LABEL_OPTS.map(l => (
            <button
              key={l.key}
              type="button"
              className={`label-opt${labels.includes(l.key) ? " active" : ""}`}
              style={{ color: l.color, borderColor: l.color }}
              onClick={() => toggleLabel(l.key)}
            >
              {l.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── ISTORIJA ── */}
      {events.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <div className="label">Istorija kretanja</div>
          <div className="ats-timeline">
            {events.slice(0, 5).map(ev => (
              <div className="ats-timeline-item" key={ev.id}>
                <span>{new Date(ev.created_at).toLocaleDateString("sr-ME")}</span>
                <span>
                  {ev.from_stage ? `${stageLabels[ev.from_stage]} → ` : ""}
                  <strong>{ev.to_stage ? stageLabels[ev.to_stage] : "—"}</strong>
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── KOMENTARI ── */}
      <div className="comments-section">
        <div className="label">Komentari tima ({comments.length})</div>
        {loading && <p className="hint">Učitavanje...</p>}
        {!loading && comments.length === 0 && <p className="hint">Još nema komentara.</p>}
        {comments.map(c => (
          <div className="comment-item" key={c.id}>
            <div className="comment-meta">{new Date(c.created_at).toLocaleString("sr-ME")}</div>
            {c.text}
          </div>
        ))}

        <div className="comment-form">
          <input
            type="text"
            className="field"
            placeholder="Dodaj komentar (Enter za slanje)"
            value={newComment}
            onChange={e => setNewComment(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !submitting) addComment(); }}
          />
          <button className="btn blue sm" type="button" disabled={submitting || !newComment.trim()} onClick={addComment}>
            {submitting ? "..." : "Dodaj"}
          </button>
        </div>
        {error && <p className="notice error" role="alert">{error}</p>}
      </div>

      <div style={{ paddingTop: 12 }}>
        <button type="button" className="btn ghost sm" style={{ width: "100%" }} onClick={onClose}>
          Zatvori panel
        </button>
      </div>
    </div>
  );
}
