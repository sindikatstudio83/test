import type { SupabaseClient } from "@supabase/supabase-js";
import type { UserRole } from "@/types/domain";

const validRoles: UserRole[] = ["guest", "candidate", "company", "admin"];

export function normalizeRole(value: unknown): UserRole {
  return typeof value === "string" && validRoles.includes(value as UserRole) ? (value as UserRole) : "guest";
}

export async function loadCurrentRole(supabase: SupabaseClient): Promise<UserRole> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return "guest";

  const user = data.user;

  const { data: profileData, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) console.error("[loadCurrentRole]", profileError.message);

  const profileRole = normalizeRole(profileData?.role);

  // Profile role is authoritative — never fall back to user_metadata for role
  // (user_metadata can be set by the client and is not trusted for access control)
  return profileRole;
}
