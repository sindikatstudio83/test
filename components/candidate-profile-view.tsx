"use client";

import { useRouter } from "next/navigation";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { createBrowserSupabase } from "@/lib/supabase/client";
import { Avatar } from "@/components/avatar";
import type { CvData } from "@/types/domain";

type CandProfile = {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  city: string | null;
  avatar_path: string | null;
  cv_data: CvData | null;
  cv_updated_at: string | null;
};

function CvBlock({ title, content }: { title: string; content?: string | null }) {
  if (!content?.trim()) return null;
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: ".1em", color: "var(--muted)", marginBottom: 5 }}>{title}</div>
      <div style={{ fontSize: 14, lineHeight: 1.75, color: "var(--ink)", whiteSpace: "pre-wrap" as const }}>{content}</div>
    </div>
  );
}

function SkillChips({ skills }: { skills?: string | null }) {
  if (!skills?.trim()) return null;
  const tags = skills.split(/[,\n]+/).map(s => s.trim()).filter(Boolean);
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: ".1em", color: "var(--muted)", marginBottom: 6 }}>Vještine</div>
      <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 6 }}>
        {tags.map(t => <span key={t} className="cand-cv-tag">{t}</span>)}
      </div>
    </div>
  );
}

export function CandidateProfileView({ candidateId }: { candidateId: string }) {
  const router = useRouter();
  const { role, userId, ready } = useAuth();
  const [cand, setCand] = useState<CandProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!ready) return;
    if (!userId || (role !== "company" && role !== "admin")) {
      router.replace("/login?next=/firma/kandidati");
      return;
    }
    load();
  }, [ready]); // eslint-disable-line react-hooks/exhaustive-deps

  async function load() {
    setLoading(true);
    const supabase = createBrowserSupabase();

    // Verify access: company must have unlocked OR candidate applied to their job
    let hasAccess = role === "admin";

    if (!hasAccess && userId) {
      const { data: company } = await supabase.from("companies").select("id").eq("owner_id", userId).maybeSingle();
      if (company) {
        // Check unlock
        const { data: unlock } = await supabase.from("company_cv_unlocks")
          .select("id").eq("company_id", company.id).eq("candidate_id", candidateId).maybeSingle();
        if (unlock) hasAccess = true;

        // Check application
        if (!hasAccess) {
          const { data: jobRows } = await supabase.from("jobs").select("id").eq("company_id", company.id);
          if (jobRows && jobRows.length > 0) {
            const { data: app } = await supabase.from("job_applications")
              .select("id").eq("candidate_id", candidateId)
              .in("job_id", jobRows.map((j: { id: number }) => j.id)).maybeSingle();
            if (app) hasAccess = true;
          }
        }
      }
    }

    if (!hasAccess) {
      setError("Nemate pristup ovom profilu.");
      setLoading(false);
      return;
    }

    const { data, error: fetchErr } = await supabase.from("profiles")
      .select("id,full_name,email,phone,city,avatar_path,cv_data,cv_updated_at")
      .eq("id", candidateId).maybeSingle();

    if (fetchErr || !data) {
      setError("Profil nije pronađen.");
    } else {
      setCand(data as CandProfile);
    }
    setLoading(false);
  }

  if (!ready || loading) {
    return <div className="app-shell"><main className="app-main"><div className="empty"><strong>Učitavanje...</strong></div></main></div>;
  }

  if (error) {
    return (
      <div className="app-shell">
        <main className="app-main">
          <p className="notice error">{error}</p>
          <Link href="/firma/kandidati" className="btn ghost sm">← Nazad</Link>
        </main>
      </div>
    );
  }

  if (!cand) return null;
  const cv = cand.cv_data;

  return (
    <div className="app-shell">
      <main className="app-main" style={{ maxWidth: 720 }}>
        <div style={{ marginBottom: 16 }}>
          <Link href="/firma/kandidati" className="btn ghost sm">← Nazad na bazu kandidata</Link>
        </div>

        <div className="panel">
          {/* Header */}
          <div style={{ display: "flex", gap: 16, alignItems: "center", marginBottom: 20, paddingBottom: 18, borderBottom: "1px solid var(--line)", flexWrap: "wrap" }}>
            <Avatar bucket="avatars" path={cand.avatar_path} fallback={cand.full_name || "K"} size={68} shape="circle" />
            <div>
              <h1 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 4px", color: "var(--ink)" }}>
                {cand.full_name || "Kandidat"}
              </h1>
              {cv?.title && <div style={{ fontSize: 14, color: "var(--muted)", marginBottom: 3 }}>{cv.title}</div>}
              {cand.city && <div style={{ fontSize: 13, color: "var(--muted)" }}>📍 {cand.city}</div>}
            </div>
          </div>

          {/* Contact buttons */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 22 }}>
            {cand.email && (
              <a href={`mailto:${cand.email}`} className="btn ghost sm">📧 {cand.email}</a>
            )}
            {cand.phone && (
              <a href={`tel:${cand.phone}`} className="btn ghost sm">📞 {cand.phone}</a>
            )}
          </div>

          {/* CV */}
          {cv?.summary && <CvBlock title="O kandidatu" content={cv.summary} />}
          <SkillChips skills={cv?.skills} />
          <CvBlock title="Radno iskustvo" content={cv?.experience} />
          <CvBlock title="Obrazovanje" content={cv?.education} />
          <CvBlock title="Jezici" content={cv?.languages} />
          <CvBlock title="Sertifikati / Kursevi" content={cv?.certificates} />

          {cv?.availability && (
            <div style={{ marginBottom: 18 }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: ".1em", color: "var(--muted)", marginBottom: 5 }}>Dostupnost</div>
              <span style={{ background: "color-mix(in srgb,var(--green) 10%,transparent)", color: "var(--green)", border: "1px solid color-mix(in srgb,var(--green) 20%,transparent)", borderRadius: 8, padding: "5px 12px", fontSize: 13, fontWeight: 600 }}>
                ✓ {cv.availability}
              </span>
            </div>
          )}

          {cand.cv_updated_at && (
            <div style={{ fontSize: 12, color: "var(--muted)", paddingTop: 12, borderTop: "1px solid var(--line)" }}>
              CV ažuriran: {new Date(cand.cv_updated_at).toLocaleDateString("sr-ME")}
            </div>
          )}

          {!cv?.summary && !cv?.experience && !cv?.skills && (
            <p style={{ color: "var(--muted)", fontSize: 14 }}>Kandidat još nije popunio biografiju.</p>
          )}
        </div>
      </main>
    </div>
  );
}
