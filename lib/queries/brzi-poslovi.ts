import { createPublicSupabase } from "@/lib/supabase/server";
import type { PublicWorkerProfile, QuickGig, Profession } from "@/types/domain";

// NOTE: Public reads go through the SECURE VIEWS that omit contact fields:
//   public_worker_profiles, public_quick_gigs
// Contact info is fetched separately via the get_worker_contact RPC (login-only).

const publicWorkerSelect =
  "id,user_id,display_name,profession_id,profession_text,cities,availability,available_from,experience_years,price_text,languages,bio,photo_path,show_phone,is_public,status,is_premium,premium_until,is_verified,slug,views,created_at,updated_at";

const publicGigSelect =
  "id,posted_by,company_id,title,profession_id,city,gig_date,gig_timing,pay_text,description,is_urgent,is_featured,status,created_at,updated_at";

export type WorkerFilters = {
  profession?: string;
  city?: string;
  availability?: string;
  premium?: boolean;
  limit?: number;
};

// ── PROFESSIONS ──────────────────────────────────────────────────────────────

export async function getProfessions(): Promise<Profession[]> {
  const db = createPublicSupabase();
  const { data, error } = await db
    .from("professions")
    .select("id,name,slug,icon,sort,active")
    .eq("active", true)
    .order("sort");
  if (error) { console.error("[getProfessions]", error.message); return []; }
  return (data ?? []) as Profession[];
}

async function professionIdFromSlug(slug: string): Promise<number | null> {
  const db = createPublicSupabase();
  const { data } = await db.from("professions").select("id").eq("slug", slug).maybeSingle();
  return data?.id ?? null;
}

type ProfLite = Pick<Profession, "id" | "name" | "slug" | "icon">;

async function attachProfessions<T extends { profession_id: number | null }>(
  rows: T[]
): Promise<(T & { professions: ProfLite | null })[]> {
  const ids = [...new Set(rows.map(r => r.profession_id).filter((x): x is number => x != null))];
  if (ids.length === 0) return rows.map(r => ({ ...r, professions: null }));
  const db = createPublicSupabase();
  const { data } = await db.from("professions").select("id,name,slug,icon").in("id", ids);
  const map = new Map((data ?? []).map(p => [p.id, p as ProfLite]));
  return rows.map(r => ({ ...r, professions: r.profession_id ? map.get(r.profession_id) ?? null : null }));
}

async function getWorkerPortfolio(workerId: number) {
  const db = createPublicSupabase();
  const { data } = await db
    .from("worker_portfolio")
    .select("id,worker_id,image_path,sort,created_at")
    .eq("worker_id", workerId)
    .order("sort");
  return (data ?? []) as { id: number; worker_id: number; image_path: string; sort: number; created_at: string }[];
}

// ── WORKER PROFILES (public, contact-free) ───────────────────────────────────

export async function getPublicWorkers(filters: WorkerFilters = {}): Promise<PublicWorkerProfile[]> {
  const db = createPublicSupabase();
  let query = db.from("public_worker_profiles").select(publicWorkerSelect);

  if (filters.profession) {
    const pid = await professionIdFromSlug(filters.profession);
    if (pid == null) return [];
    query = query.eq("profession_id", pid);
  }
  if (filters.city) query = query.contains("cities", [filters.city]);
  if (filters.availability) query = query.eq("availability", filters.availability);
  if (filters.premium) query = query.eq("is_premium", true);

  query = query
    .order("is_premium", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(filters.limit ?? 60);

  const { data, error } = await query;
  if (error) { console.error("[getPublicWorkers]", error.message); return []; }
  const withProf = await attachProfessions((data ?? []) as unknown as (PublicWorkerProfile & { profession_id: number | null })[]);
  return withProf as unknown as PublicWorkerProfile[];
}

export async function getWorkerBySlug(slug: string): Promise<PublicWorkerProfile | null> {
  const db = createPublicSupabase();
  const { data, error } = await db.from("public_worker_profiles").select(publicWorkerSelect).eq("slug", slug).maybeSingle();
  if (error) { console.error("[getWorkerBySlug]", error.message); return null; }
  if (!data) return null;
  const [withProf] = await attachProfessions([data as unknown as PublicWorkerProfile & { profession_id: number | null }]);
  const worker = withProf as unknown as PublicWorkerProfile;
  worker.worker_portfolio = await getWorkerPortfolio(worker.id);
  return worker;
}

export async function getWorkerById(id: number): Promise<PublicWorkerProfile | null> {
  const db = createPublicSupabase();
  const { data, error } = await db.from("public_worker_profiles").select(publicWorkerSelect).eq("id", id).maybeSingle();
  if (error) { console.error("[getWorkerById]", error.message); return null; }
  if (!data) return null;
  const [withProf] = await attachProfessions([data as unknown as PublicWorkerProfile & { profession_id: number | null }]);
  const worker = withProf as unknown as PublicWorkerProfile;
  worker.worker_portfolio = await getWorkerPortfolio(worker.id);
  return worker;
}

// ── QUICK GIGS (public) ──────────────────────────────────────────────────────

export type GigFilters = {
  profession?: string;
  city?: string;
  urgent?: boolean;
  limit?: number;
};

export async function getPublicGigs(filters: GigFilters = {}): Promise<QuickGig[]> {
  const db = createPublicSupabase();
  let query = db.from("public_quick_gigs").select(publicGigSelect);

  if (filters.profession) {
    const pid = await professionIdFromSlug(filters.profession);
    if (pid == null) return [];
    query = query.eq("profession_id", pid);
  }
  if (filters.city) query = query.eq("city", filters.city);
  if (filters.urgent) query = query.eq("is_urgent", true);

  query = query
    .order("is_featured", { ascending: false })
    .order("is_urgent", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(filters.limit ?? 60);

  const { data, error } = await query;
  if (error) { console.error("[getPublicGigs]", error.message); return []; }

  const rows = (data ?? []) as unknown as QuickGig[];
  const withProf = await attachProfessions(rows as unknown as { profession_id: number | null }[]);
  const companyIds = [...new Set(rows.map(r => r.company_id).filter((x): x is number => x != null))];
  let companyMap = new Map<number, { id: number; name: string; slug: string }>();
  if (companyIds.length) {
    const { data: cos } = await db.from("companies").select("id,name,slug").in("id", companyIds);
    companyMap = new Map((cos ?? []).map(c => [c.id, c as { id: number; name: string; slug: string }]));
  }
  return rows.map((r, i) => ({
    ...r,
    professions: (withProf[i] as { professions: QuickGig["professions"] }).professions,
    companies: r.company_id ? companyMap.get(r.company_id) ?? null : null,
  }));
}

export async function getGigById(id: number): Promise<QuickGig | null> {
  const db = createPublicSupabase();
  const { data, error } = await db.from("public_quick_gigs").select(publicGigSelect).eq("id", id).maybeSingle();
  if (error) { console.error("[getGigById]", error.message); return null; }
  if (!data) return null;
  const row = data as unknown as QuickGig;
  const [withProf] = await attachProfessions([row as unknown as { profession_id: number | null }]);
  let company: { id: number; name: string; slug: string } | null = null;
  if (row.company_id) {
    const { data: co } = await db.from("companies").select("id,name,slug").eq("id", row.company_id).maybeSingle();
    company = (co as { id: number; name: string; slug: string } | null) ?? null;
  }
  return {
    ...row,
    professions: (withProf as { professions: QuickGig["professions"] }).professions,
    companies: company,
  };
}

// ── COMBINED OVERVIEW ────────────────────────────────────────────────────────

export async function getBrziPosloviOverview(): Promise<{
  workers: PublicWorkerProfile[];
  gigs: QuickGig[];
  professions: Profession[];
}> {
  const [workers, gigs, professions] = await Promise.all([
    getPublicWorkers({ limit: 8 }),
    getPublicGigs({ limit: 6 }),
    getProfessions(),
  ]);
  return { workers, gigs, professions };
}
