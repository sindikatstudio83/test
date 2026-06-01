"use client";

import { useRouter } from "next/navigation";

import { DashboardSideNav } from "@/components/dashboard-side-nav";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { createBrowserSupabase } from "@/lib/supabase/client";
import { safeMessage, logError } from "@/lib/errors";
import { Avatar } from "@/components/avatar";
import Link from "next/link";

type Candidate = {
  id: string;
  full_name: string | null;
  city: string | null;
  email: string | null;
  phone: string | null;
  headline: string | null;
  avatar_path: string | null;
  skills?: string[];
  worker_type?: string | null;
  quick_jobs_enabled?: boolean;
  is_unlocked: boolean;
};

type Notice = { text: string; type: "info" | "error" | "success" };

// SideNav replaced by DashboardSideNav (see components/dashboard-side-nav.tsx)

function maskName(name: string | null): string {
  if (!name) return "Kandidat";
  const parts = name.split(" ");
  return parts.map((p, i) => i === 0 ? p : p.charAt(0) + "**").join(" ");
}

export function CvUnlockClient() {
  const router = useRouter();
  const { role, userId, email: authEmail, ready } = useAuth();
  const supabase = createBrowserSupabase();
  const [companyId, setCompanyId] = useState<number | null>(null);
  const [companyName, setCompanyName] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [creditBalance, setCreditBalance] = useState(0);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [unlocking, setUnlocking] = useState<string | null>(null);
  const [searchQ, setSearchQ] = useState("");
  const [searchCity, setSearchCity] = useState("");
  const [quickOnly, setQuickOnly] = useState(false);

  useEffect(() => {
    if (!ready) return;
    if (!userId || (role !== "company" && role !== "admin")) {
      router.replace("/login?next=/firma/kandidati");
      return;
    }
    setEmail(authEmail || "");
    loadCompanyAndCredits();
  }, [ready]); // eslint-disable-line react-hooks/exhaustive-deps

  async function loadCompanyAndCredits() {
    setLoading(true);
    const { data: co } = await supabase
      .from("companies")
      .select("id,name")
      .eq("owner_id", userId)
      .maybeSingle();

    if (!co) { setLoading(false); return; }
    setCompanyId(co.id);
    setCompanyName(co.name);

    // Krediti
    const { data: balance } = await supabase.rpc("get_company_credit_balance", { p_company_id: co.id });
    setCreditBalance(Number(balance) || 0);

    // Već otključani kandidati
    const { data: unlocked } = await supabase
      .from("company_cv_unlocks")
      .select("candidate_id")
      .eq("company_id", co.id);
    const unlockedSet = new Set<string>((unlocked || []).map((u: { candidate_id: string }) => u.candidate_id));

    // Učitaj kandidate
    await searchCandidates(co.id, unlockedSet);
    setLoading(false);
  }

  async function searchCandidates(coId?: number, unlockedSet?: Set<string>) {
    const id = coId || companyId;
    if (!id) return;

    setSearching(true);

    // Učitaj unlocke ako nisu proslijeđeni
    if (!unlockedSet) {
      const { data: unlocked } = await supabase
        .from("company_cv_unlocks")
        .select("candidate_id")
        .eq("company_id", id);
      unlockedSet = new Set((unlocked || []).map((u: { candidate_id: string }) => u.candidate_id));
    }

    // Pretraga kandidata — javni podaci samo
    let q = supabase
      .from("profiles")
      .select("id,full_name,city,avatar_path")  // cv_data intentionally excluded — only fetched after unlock
      .eq("role", "candidate");

    if (searchCity) q = q.ilike("city", `%${searchCity}%`);

    // candidate_profiles join za headline, skills, worker_type, quick_jobs
    // Koristimo zasebni upit jer nema direktnog join API
    const { data: profiles } = await q.order("created_at", { ascending: false }).limit(40);

    // Za svaki profil pokušaj dohvatiti candidate_profiles podatke
    const profileIds = (profiles || []).map((p: { id: string }) => p.id);
    const { data: cpData } = profileIds.length
      ? await supabase.from("candidate_profiles").select("user_id,headline,skills,worker_type,quick_jobs_enabled").in("user_id", profileIds)
      : { data: [] };

    type CpRow = { user_id: string; headline: string | null; skills: string[]; worker_type: string | null; quick_jobs_enabled: boolean };
    const cpMap = new Map<string, CpRow>((cpData || []).map((cp: CpRow) => [cp.user_id, cp]));

    let candidateList: Candidate[] = (profiles || []).map((p: { id: string; full_name: string | null; city: string | null; email: string | null; phone: string | null; avatar_path: string | null }) => {
      const cp = cpMap.get(p.id);
      return {
        id: p.id,
        full_name: p.full_name,
        city: p.city,
        email: p.email,
        phone: p.phone,
        avatar_path: p.avatar_path,
        headline: cp?.headline || null,
        skills: cp?.skills || [],
        worker_type: cp?.worker_type || null,
        quick_jobs_enabled: cp?.quick_jobs_enabled || false,
        is_unlocked: unlockedSet!.has(p.id),
      };
    });

    // Filtriraj
    if (searchQ) {
      const q2 = searchQ.toLowerCase();
      candidateList = candidateList.filter(c =>
        (c.full_name || "").toLowerCase().includes(q2) ||
        (c.headline || "").toLowerCase().includes(q2) ||
        (c.worker_type || "").toLowerCase().includes(q2) ||
        (c.skills || []).some(s => s.toLowerCase().includes(q2))
      );
    }
    if (quickOnly) candidateList = candidateList.filter(c => c.quick_jobs_enabled);

    setCandidates(candidateList);
    setSearching(false);
  }

  async function handleUnlock(candidateId: string) {
    if (!companyId) return;
    if (creditBalance < 1) {
      setNotice({ type: "error", text: "Nemate dovoljno kredita. Nadogradite paket na stranici Pretplata." });
      return;
    }
    setUnlocking(candidateId);
    setNotice(null);

    // Provjeri da li već unlock postoji
    const { data: existing } = await supabase
      .from("company_cv_unlocks")
      .select("id")
      .eq("company_id", companyId)
      .eq("candidate_id", candidateId)
      .maybeSingle();

    if (existing) {
      // Već otključano, samo označi
      setCandidates(prev => prev.map(c => c.id === candidateId ? { ...c, is_unlocked: true } : c));
      setUnlocking(null);
      return;
    }

    // Troši kredit
    const { data: spendResult } = await supabase.rpc("spend_company_credits", {
      p_company_id: companyId,
      p_amount: 1,
      p_type: "cv_unlock",
      p_reference_type: "candidate",
      p_reference_id: candidateId,
    });

    if (!spendResult?.success) {
      setUnlocking(null);
      setNotice({ type: "error", text: spendResult?.error === "insufficient_credits" ? "Nedovoljan broj kredita." : "Greška pri oduzimanju kredita." });
      return;
    }

    // Kreiraj unlock zapis
    const { error: unlockError } = await supabase.from("company_cv_unlocks").insert({
      company_id: companyId,
      candidate_id: candidateId,
      credits_spent: 1,
    });

    if (unlockError) {
      logError("CvUnlock.insert", unlockError);
      setNotice({ type: "error", text: safeMessage(unlockError, "save") });
      setUnlocking(null);
      return;
    }

    setCreditBalance(spendResult.balance_after);
    setCandidates(prev => prev.map(c => c.id === candidateId ? { ...c, is_unlocked: true } : c));
    setNotice({ type: "success", text: "CV otključan! Sada možete vidjeti kontakt podatke kandidata." });
    setUnlocking(null);
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
            <span className="page-label">Kandidati</span>
            <h1>Baza kandidata</h1>
            <p className="sub">Pronađite i otključajte kontakt podatke kandidata.</p>
          </div>
          {/* Stanje kredita */}
          <div className="credit-strip">
            <span>Krediti:</span>
            <span className={`credit-strip__val${creditBalance < 3 ? " credit-strip__warn" : ""}`}>{creditBalance}</span>
            {creditBalance < 3 && <span className="credit-strip__warn">— malo</span>}
            <Link href="/firma/pretplata" className="btn blue xs">+ Dopuni</Link>
          </div>
        </div>

        {notice && <p className={`notice ${notice.type}`} style={{ marginBottom: 14 }}>{notice.text}</p>}

        {/* Pretraga */}
        <div className="search-panel desktop-only" style={{ marginBottom: 14 }}>
          <input
            placeholder="Zanimanje, vještina, ime..."
            value={searchQ}
            onChange={e => setSearchQ(e.target.value)}
            onKeyDown={e => e.key === "Enter" && searchCandidates()}
          />
          <input
            placeholder="Grad"
            value={searchCity}
            onChange={e => setSearchCity(e.target.value)}
            onKeyDown={e => e.key === "Enter" && searchCandidates()}
          />
          <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 800, color: "var(--muted)" }}>
            <input type="checkbox" checked={quickOnly} onChange={e => setQuickOnly(e.target.checked)} />
            Brzi poslovi
          </label>
          <button className="btn blue sm" disabled={searching} onClick={() => searchCandidates()}>
            {searching ? "Pretraga..." : "Traži"}
          </button>
        </div>

        {/* Lista kandidata */}
        <div className="candidate-list">
          {candidates.length === 0 && !searching && (
            <div className="empty">
              <strong>Nema kandidata</strong>
              <p>Pokušajte drugačiju pretragu ili sačekajte da se više kandidata registruje.</p>
            </div>
          )}

          {candidates.map(c => {
            const isUnlocked = c.is_unlocked;
            return (
              <div key={c.id} className={`candidate-card${isUnlocked ? " candidate-card--unlocked" : ""}`}>
                <div className="candidate-card__avatar">
                  <Avatar bucket="avatars" path={c.avatar_path} fallback={c.full_name || "K"} size={48} shape="circle" />
                </div>
                <div className="candidate-card__info">
                  <span className="candidate-card__name">
                    {isUnlocked ? (c.full_name || "Kandidat") : maskName(c.full_name)}
                  </span>
                  {c.headline && <span className="candidate-card__headline">{c.headline}</span>}
                  <div className="candidate-card__meta">
                    {c.city && <span>📍 {c.city}</span>}
                    {c.worker_type && <span>💼 {c.worker_type}</span>}
                    {c.quick_jobs_enabled && <span className="badge lime">⚡ Brzi poslovi</span>}
                  </div>
                  {c.skills && c.skills.length > 0 && (
                    <div className="candidate-card__skills">
                      {c.skills.slice(0, 5).map(s => <span key={s} className="skill-tag">{s}</span>)}
                    </div>
                  )}
                  {isUnlocked && (
                    <div className="candidate-card__contact">
                      {c.email && <span>✉ {c.email}</span>}
                      {c.phone && <span>📞 {c.phone}</span>}
                    </div>
                  )}
                </div>
                <div className="candidate-card__action">
                  {isUnlocked ? (
                    <>
                      <span className="unlock-badge">✓ Otključano</span>
                      <Link
                        href={`/firma/kandidati/${c.id}`}
                        className="btn blue xs"
                        style={{ marginTop: 6 }}
                      >
                        📄 Otvori profil / CV
                      </Link>
                    </>
                  ) : (
                      <button
                        className="btn blue sm"
                        disabled={unlocking === c.id}
                        onClick={() => handleUnlock(c.id)}
                      >
                        {unlocking === c.id ? "..." : "🔓 Otključaj CV (1 kredit)"}
                      </button>
                    )
                  }
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
