// No "use client" — this module is safe to use in both server and client contexts.
// Client components that call these functions import createBrowserSupabase themselves.
import { createBrowserSupabase } from "@/lib/supabase/client";
import { logError } from "@/lib/errors";
import type { SavedJob, JobAlert, Notification, CompanyActivePlan } from "@/types/domain";

const jobSelect = "id,title,slug,description,contract_type,salary_text,deadline,status,featured,company_id,companies(id,name,slug,logo_path),categories(id,name,slug),cities(id,name,slug)";

// ── SAVED JOBS ──────────────────────────────────────────────────────────────

export async function getSavedJobs(userId: string): Promise<SavedJob[]> {
  const supabase = createBrowserSupabase();
  const { data, error } = await supabase
    .from("saved_jobs")
    .select(`id,user_id,job_id,created_at,jobs(${jobSelect})`)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) { logError("getSavedJobs", error); return []; }
  return (data ?? []) as unknown as SavedJob[];
}

export async function saveJob(userId: string, jobId: number): Promise<boolean> {
  const supabase = createBrowserSupabase();
  const { error } = await supabase.from("saved_jobs").insert({ user_id: userId, job_id: jobId });
  if (error && error.code !== "23505") logError("saveJob", error);
  return !error;
}

export async function unsaveJob(userId: string, jobId: number): Promise<boolean> {
  const supabase = createBrowserSupabase();
  const { error } = await supabase.from("saved_jobs").delete()
    .eq("user_id", userId).eq("job_id", jobId);
  if (error) logError("unsaveJob", error);
  return !error;
}

export async function isSaved(userId: string, jobId: number): Promise<boolean> {
  const supabase = createBrowserSupabase();
  const { data } = await supabase.from("saved_jobs").select("id")
    .eq("user_id", userId).eq("job_id", jobId).maybeSingle();
  return Boolean(data);
}

// ── JOB ALERTS ──────────────────────────────────────────────────────────────

export async function getJobAlerts(userId: string): Promise<JobAlert[]> {
  const supabase = createBrowserSupabase();
  const { data, error } = await supabase
    .from("job_alerts")
    .select("*,cities(id,name),categories(id,name)")
    .eq("candidate_id", userId)
    .order("created_at", { ascending: false });
  if (error) { logError("getJobAlerts", error); return []; }
  return (data ?? []) as unknown as JobAlert[];
}

export async function createJobAlert(userId: string, alert: Partial<JobAlert>): Promise<boolean> {
  const supabase = createBrowserSupabase();
  const { error } = await supabase.from("job_alerts").insert({
    candidate_id: userId,
    city_id: alert.city_id ?? null,
    category_id: alert.category_id ?? null,
    contract_type: alert.contract_type ?? null,
    keywords: alert.keywords ?? null,
    active: alert.active ?? true
  });
  if (error) logError("createJobAlert", error);
  return !error;
}

export async function deleteJobAlert(alertId: number): Promise<boolean> {
  const supabase = createBrowserSupabase();
  const { error } = await supabase.from("job_alerts").delete().eq("id", alertId);
  if (error) logError("deleteJobAlert", error);
  return !error;
}

// ── NOTIFICATIONS ────────────────────────────────────────────────────────────

export async function getNotifications(userId: string, limit = 20): Promise<Notification[]> {
  const supabase = createBrowserSupabase();
  const { data, error } = await supabase
    .from("notifications").select("*")
    .eq("recipient_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) { logError("getNotifications", error); return []; }
  return (data ?? []) as Notification[];
}

export async function markNotificationsRead(userId: string, ids: number[]): Promise<void> {
  if (!ids.length) return;
  const supabase = createBrowserSupabase();
  await supabase.from("notifications").update({ read: true })
    .eq("recipient_id", userId).in("id", ids);
}

// ── COMPANY PLAN ──────────────────────────────────────────────────────────────

export async function getCompanyActivePlan(companyId: number): Promise<CompanyActivePlan | null> {
  const supabase = createBrowserSupabase();
  const { data, error } = await supabase
    .from("company_active_plans")
    .select("*")
    .eq("company_id", companyId)
    .maybeSingle();
  if (error) { logError("getCompanyActivePlan", error); return null; }
  return data as CompanyActivePlan | null;
}

// ── JOB VIEW TRACKER ──────────────────────────────────────────────────────────

export async function trackJobView(jobId: number, userId: string | null): Promise<void> {
  try {
    const supabase = createBrowserSupabase();
    await supabase.rpc("increment_job_view", { p_job_id: jobId, p_user_id: userId ?? null });
  } catch {
    // Best-effort tracking — silent fail is intentional
  }
}
