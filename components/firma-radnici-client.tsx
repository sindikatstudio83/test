"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { createBrowserSupabase } from "@/lib/supabase/client";
import { DashboardSideNav } from "@/components/dashboard-side-nav";
import { WorkerCard } from "@/components/worker-card";
import { availabilityLabels } from "@/lib/labels";
import { logError } from "@/lib/errors";
import type { PublicWorkerProfile, Profession, AvailabilityType } from "@/types/domain";

type Props = { profession?: string; city?: string; availability?: string };

export function FirmaRadniciClient({ profession, city, availability }: Props) {
  const { userId, email: authEmail, ready, role } = useAuth();
  const router = useRouter();
  const [workers, setWorkers] = useState<PublicWorkerProfile[]>([]);
  const [professions, setProfessions] = useState<Profession[]>([]);
  const [companyName, setCompanyName] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ready) return;
    if (!userId || role === "guest") { router.replace("/login?next=/firma/radnici"); return; }
    if (role !== "company" && role !== "admin") { router.replace("/profil"); return; }
    setEmail(authEmail || "");

    async function load() {
      const supabase = createBrowserSupabase();

      const [profRes, coRes] = await Promise.all([
        supabase.from("professions").select("id,name,slug,icon,sort,active").eq("active", true).order("sort"),
        supabase.from("companies").select("name").eq("owner_id", userId!).limit(1).maybeSingle(),
      ]);
      setProfessions((profRes.data || []) as Profession[]);
      setCompanyName((coRes.data as { name: string } | null)?.name ?? null);

      // Resolve profession slug to id for DB-level filter
      let profId: number | null = null;
      if (profession) {
        const { data: p } = await supabase.from("professions").select("id").eq("slug", profession).maybeSingle();
        profId = p?.id ?? null;
      }

      let q = supabase.from("public_worker_profiles").select("*");
      if (profId != null) q = q.eq("profession_id", profId);
      if (city) q = q.contains("cities", [city]);
      if (availability) q = q.eq("availability", availability);
      q = q.order("is_premium", { ascending: false }).order("created_at", { ascending: false }).limit(60);

      const { data, error } = await q;
      if (error) logError("FirmaRadnici.load", error);

      // Attach professions
      const rows = (data || []) as unknown as PublicWorkerProfile[];
      const ids = [...new Set(rows.map(r => r.profession_id).filter((x): x is number => x != null))];
      if (ids.length) {
        const { data: profs } = await supabase.from("professions").select("id,name,slug,icon").in("id", ids);
        const map = new Map((profs || []).map((p: { id: number; name: string; slug: string; icon: string | null }) => [p.id, p]));
        rows.forEach(r => { r.professions = r.profession_id ? (map.get(r.profession_id) as PublicWorkerProfile["professions"]) ?? null : null; });
      }
      setWorkers(rows);
      setLoading(false);
    }
    load();
  }, [ready, userId, role, authEmail, profession, city, availability, router]);

  if (!ready || loading) {
    return (
      <div className="app-shell">
        <div className="loading-panel" style={{ gridColumn: "1/-1" }}><p>Učitavanje...</p></div>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <DashboardSideNav role={role === "admin" ? "admin" : "company"} email={email} displayName={companyName} />
      <main className="app-main">
        <div className="section-head">
          <div>
            <span className="page-label">Brzi poslovi</span>
            <h1>Dostupni radnici</h1>
            <p className="sub">Pronađi radnika za brzi angažman i kontaktiraj ga direktno.</p>
          </div>
          <Link className="btn blue" href="/firma/brzi-angazman">+ Objavi angažman</Link>
        </div>

        <div className="bp-professions" aria-label="Filtriraj po zanimanju">
          <Link href="/firma/radnici" className={`bp-prof-chip${!profession ? " active" : ""}`}>Sve</Link>
          {professions.map((p) => (
            <Link key={p.id} href={`/firma/radnici?profession=${p.slug}`}
              className={`bp-prof-chip${profession === p.slug ? " active" : ""}`}>
              {p.icon && <span className="bp-prof-chip__icon" aria-hidden>{p.icon}</span>}
              {p.name}
            </Link>
          ))}
        </div>

        <form className="bp-filters" method="get" action="/firma/radnici">
          {profession && <input type="hidden" name="profession" value={profession} />}
          <input className="field" name="city" placeholder="Grad" defaultValue={city || ""} aria-label="Grad" />
          <select className="select" name="availability" defaultValue={availability || ""} aria-label="Dostupnost">
            <option value="">Sva dostupnost</option>
            {(Object.keys(availabilityLabels) as AvailabilityType[]).map((a) => (
              <option key={a} value={a}>{availabilityLabels[a]}</option>
            ))}
          </select>
          <button className="btn blue" type="submit">Filtriraj</button>
        </form>

        {workers.length > 0 ? (
          <div className="bp-worker-grid">
            {workers.map((w) => <WorkerCard key={w.id} worker={w} />)}
          </div>
        ) : (
          <div className="bp-empty">
            <strong>Nema radnika za zadatu pretragu</strong>
            <p>Pokušaj sa drugim filterima.</p>
          </div>
        )}
      </main>
    </div>
  );
}
