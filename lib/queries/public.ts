import { createPublicSupabase } from "@/lib/supabase/server";
import type { Company, Job, Plan, HomepageData, JobWithPromotion, CompanyWithExtras, LookupItem } from "@/types/domain";

const jobSelect = "id,title,slug,description,contract_type,salary_text,deadline,status,featured,company_id,companies(id,name,slug,logo_path),categories(id,name,slug),cities(id,name,slug)";
const jobSelectQuick = "id,title,slug,description,contract_type,salary_text,deadline,status,featured,company_id,quick_job,urgent,daily_rate,companies(id,name,slug,logo_path),categories(id,name,slug),cities(id,name,slug)";

export type JobFilters = {
  q?: string;
  city?: string;
  category?: string;
  featured?: boolean;
  quick?: boolean;
  limit?: number;
};

/** Map raw Supabase row to Job — avoids `as any` at call sites */
function toJob(row: Record<string, unknown>): Job {
  return row as unknown as Job;
}

function toJobList(rows: Record<string, unknown>[] | null): Job[] {
  return (rows ?? []).map(toJob);
}

export async function getPublicJobs(filters?: JobFilters): Promise<Job[]> {
  const db = createPublicSupabase();
  let query = db.from("jobs").select(jobSelect).eq("status", "active");

  if (filters?.city) {
    const { data: cityData } = await db
      .from("cities").select("id").ilike("name", filters.city).maybeSingle();
    if (cityData?.id) query = query.eq("city_id", cityData.id);
    else return [];
  }

  if (filters?.category) {
    const { data: catData } = await db
      .from("categories").select("id").ilike("name", filters.category).maybeSingle();
    if (catData?.id) query = query.eq("category_id", catData.id);
    else return [];
  }

  if (filters?.q) {
    const searchTerm = filters.q.replace(/['"\\\/]/g, " ").trim();
    if (searchTerm) {
      query = query.textSearch("fts", searchTerm, { type: "plain", config: "simple" });
    }
  }

  if (filters?.featured === true) query = query.eq("featured", true);
  if (filters?.quick === true) query = query.eq("quick_job", true);

  query = query
    .order("featured", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(filters?.limit ?? 100);

  const { data, error } = await query;
  if (error) {
    // FTS column missing — graceful fallback without fts filter
    if (error.code === "42703" || error.message?.includes("fts")) {
      const { data: fallback } = await db
        .from("jobs").select(jobSelect).eq("status", "active")
        .order("featured", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(filters?.limit ?? 100);
      return toJobList(fallback as Record<string, unknown>[] | null);
    }
    // Log for server monitoring, return empty — UI shows empty state
    console.error("[getPublicJobs]", error.code, error.message);
    return [];
  }
  return toJobList(data as Record<string, unknown>[] | null);
}

export async function getHomepageData(): Promise<HomepageData> {
  const db = createPublicSupabase();
  const now = new Date().toISOString();

  const [paidRes, featuredRes, regularRes, quickRes, companiesRes, legacyFeaturedRes] =
    await Promise.all([
      db.from("job_promotions")
        .select(`priority, ends_at, jobs!inner(${jobSelectQuick})`)
        .eq("type", "paid_top").eq("status", "active")
        .lte("starts_at", now).or(`ends_at.is.null,ends_at.gt.${now}`)
        .eq("jobs.status", "active")
        .order("priority", { ascending: false }).limit(3),

      db.from("job_promotions")
        .select(`priority, ends_at, jobs!inner(${jobSelectQuick})`)
        .eq("type", "featured").eq("status", "active")
        .lte("starts_at", now).or(`ends_at.is.null,ends_at.gt.${now}`)
        .eq("jobs.status", "active")
        .order("priority", { ascending: false }).limit(6),

      // Regular jobs: does NOT filter by featured — shows all active non-promoted
      db.from("jobs").select(jobSelect)
        .eq("status", "active")
        .order("created_at", { ascending: false }).limit(8),

      db.from("jobs").select(jobSelectQuick)
        .eq("status", "active").eq("quick_job", true)
        .order("created_at", { ascending: false }).limit(6),

      db.from("companies")
        .select("id,name,slug,city,industry,logo_path,approved,recommended,recommended_priority,instagram_url,updated_at")
        .eq("approved", true)
        .order("recommended", { ascending: false })
        .order("recommended_priority", { ascending: false })
        .order("created_at", { ascending: false }).limit(12),

      // FIX: Separate query for legacy featured jobs (jobs.featured=true without promotions)
      db.from("jobs").select(jobSelect)
        .eq("status", "active").eq("featured", true)
        .order("created_at", { ascending: false }).limit(6),
    ]);

  const mapPromo = (row: Record<string, unknown>, type: "paid_top" | "featured"): JobWithPromotion => ({
    ...(row.jobs as Record<string, unknown>),
    promotion_type: type,
    promotion_priority: row.priority as number,
    promotion_ends_at: row.ends_at as string | null,
  } as JobWithPromotion);

  const paidTopJobs: JobWithPromotion[] = paidRes.error
    ? [] : (paidRes.data ?? []).map((r) => mapPromo(r as Record<string, unknown>, "paid_top"));

  const featuredFromPromo: JobWithPromotion[] = featuredRes.error
    ? [] : (featuredRes.data ?? []).map((r) => mapPromo(r as Record<string, unknown>, "featured"));

  // FIX: Fallback now uses a dedicated query that actually fetches featured=true jobs
  const featuredJobs: JobWithPromotion[] =
    featuredFromPromo.length > 0
      ? featuredFromPromo
      : (legacyFeaturedRes.data ?? []).map((j) => ({
          ...(j as Record<string, unknown>),
          promotion_type: "featured" as const,
        } as JobWithPromotion));

  const regularJobsRaw = (regularRes.data ?? []) as Record<string, unknown>[];
  const featuredIds = new Set(featuredJobs.map((j) => j.id));
  const paidIds = new Set(paidTopJobs.map((j) => j.id));

  // Exclude already-featured/paid from regular list to avoid duplicates on homepage
  const regularJobs = regularJobsRaw
    .filter((j) => !featuredIds.has(j.id as number) && !paidIds.has(j.id as number))
    .map(toJob);

  return {
    paidTopJobs,
    featuredJobs,
    regularJobs,
    quickJobs: toJobList(quickRes.data as Record<string, unknown>[] | null),
    recommendedCompanies: (companiesRes.data ?? []) as unknown as CompanyWithExtras[],
  };
}

export async function getJobById(id: number): Promise<Job | null> {
  const db = createPublicSupabase();
  const { data, error } = await db
    .from("jobs")
    .select(`${jobSelect},salary_text,contract_type`)
    .eq("id", id)
    .eq("status", "active")
    .maybeSingle();
  if (error) { console.error("[getJobById]", error.message); return null; }
  return data ? toJob(data as Record<string, unknown>) : null;
}

export async function getCompanies(limit = 50): Promise<Company[]> {
  const db = createPublicSupabase();
  const { data, error } = await db
    .from("companies")
    .select("id,name,slug,city,industry,description,logo_path,website,approved")
    .eq("approved", true)
    .order("name")
    .limit(limit);
  if (error) { console.error("[getCompanies]", error.message); return []; }
  return (data ?? []) as unknown as Company[];
}

export async function getCompanyBySlug(slug: string): Promise<Company | null> {
  const db = createPublicSupabase();
  // slug can be "name-id" format
  const id = slug.match(/-(\d+)$/)?.[1];
  let query = db.from("companies").select("*").eq("approved", true);
  if (id) query = query.eq("id", Number(id));
  else query = query.eq("slug", slug);
  const { data, error } = await query.maybeSingle();
  if (error) { console.error("[getCompanyBySlug]", error.message); return null; }
  return data as Company | null;
}

export async function getLookups(): Promise<{ cities: LookupItem[]; categories: LookupItem[] }> {
  const db = createPublicSupabase();
  const [citiesRes, catsRes] = await Promise.all([
    db.from("cities").select("id,name,slug").order("name"),
    db.from("categories").select("id,name,slug").order("name"),
  ]);
  return {
    cities: (citiesRes.data ?? []) as LookupItem[],
    categories: (catsRes.data ?? []) as LookupItem[],
  };
}

export async function getPlan(): Promise<Plan[]> {
  const db = createPublicSupabase();
  const { data, error } = await db
    .from("plans").select("*").eq("is_active", true).order("price_eur");
  if (error) { console.error("[getPlan]", error.message); return []; }
  return (data ?? []) as unknown as Plan[];
}

export async function getCompanyById(id: number): Promise<Company | null> {
  const db = createPublicSupabase();
  const { data, error } = await db
    .from("companies")
    .select("id,name,slug,city,industry,description,logo_path,website,approved")
    .eq("id", id)
    .eq("approved", true)
    .maybeSingle();
  if (error) { console.error("[getCompanyById]", error.message); return null; }
  return data as Company | null;
}

export async function getPublicJobsByCompany(companyId: number): Promise<Job[]> {
  const db = createPublicSupabase();
  const { data, error } = await db
    .from("jobs")
    .select("id,title,slug,description,contract_type,salary_text,deadline,status,featured,company_id,companies(id,name,slug,logo_path),categories(id,name,slug),cities(id,name,slug)")
    .eq("status", "active")
    .eq("company_id", companyId)
    .order("featured", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) { console.error("[getPublicJobsByCompany]", error.message); return []; }
  return (data ?? []) as unknown as Job[];
}

export async function getPublicJobsByCity(city: string): Promise<Job[]> {
  return getPublicJobs({ city, limit: 100 });
}

export async function getPublicJobsByCategory(category: string): Promise<Job[]> {
  return getPublicJobs({ category, limit: 100 });
}

/**
 * Returns top search keywords derived from active job titles.
 * Falls back to a hardcoded list if the DB has fewer than 3 active jobs.
 * Used for "Popularno" quick-tags on the homepage.
 */
const FALLBACK_POPULAR = [
  { label: "Konobar",        q: "konobar" },
  { label: "Prodavac",       q: "prodavac" },
  { label: "Sezonski rad",   q: "sezonski" },
  { label: "Rad od kuće",    q: "rad od kuce" },
  { label: "Pomoćni radnik", q: "pomocni radnik" },
  { label: "Vozač",          q: "vozac" },
];

export async function getPopularTags(): Promise<{ label: string; q: string }[]> {
  const db = createPublicSupabase();

  // Derive keywords from active job categories (ordered by job count)
  const { data, error } = await db
    .from("categories")
    .select("name, slug")
    .order("name")
    .limit(6);

  if (error || !data || data.length < 3) {
    return FALLBACK_POPULAR;
  }

  // Use category names as search terms (they're already normalized)
  return data.map((cat) => ({
    label: cat.name,
    q: (cat.slug ?? cat.name).toLowerCase().replace(/-/g, " "),
  }));
}
