import { createPublicSupabase } from "@/lib/supabase/server";
import type { Banner, BannerPlacement, BannerAudience } from "@/types/domain";

/**
 * Vraća prvi aktivan banner za datu lokaciju (legacy — za BannerSlot).
 */
export async function getActiveBanner(
  placement: BannerPlacement,
  audience: BannerAudience = "all"
): Promise<Banner | null> {
  const banners = await getActiveBanners(placement, audience, 1);
  return banners[0] ?? null;
}

/**
 * Vraća više aktivnih banera za datu lokaciju.
 * Koristi se za hero carousel (homepage_hero, limit 5).
 */
export async function getActiveBanners(
  placement: BannerPlacement,
  audience: BannerAudience = "all",
  limit = 5
): Promise<Banner[]> {
  const db = createPublicSupabase();
  const now = new Date().toISOString();

  let query = db
    .from("banners")
    .select("*")
    .eq("placement", placement)
    .eq("approved", true)
    .order("priority", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit);

  if (audience !== "all") {
    query = query.in("target_audience", ["all", audience]);
  }

  query = query.or(`start_date.is.null,start_date.lte.${now}`);
  query = query.or(`end_date.is.null,end_date.gte.${now}`);

  const { data, error } = await query;
  if (error && error.code !== "PGRST116") {
    console.error("[getActiveBanners]", error.message);
    return [];
  }
  return (data || []) as Banner[];
}

/** Admin: čita SVE banere. */
export async function getAllBannersAdmin(): Promise<Banner[]> {
  const db = createPublicSupabase();
  const { data, error } = await db
    .from("banners")
    .select("*")
    .order("placement")
    .order("priority", { ascending: false });
  if (error) {
    console.error("[getAllBannersAdmin]", error.message);
    return [];
  }
  return (data || []) as Banner[];
}
