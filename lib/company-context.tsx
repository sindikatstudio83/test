"use client";

/**
 * CompanyContext — shared state for all company dashboard sub-pages.
 *
 * Extracted from the monolithic CompanyClient to allow per-view components
 * (CompanyDashboard, CompanyJobList, NewJobForm, CompanyBilling) to read/write
 * shared data without prop-drilling or re-fetching on each route change.
 *
 * Architecture:
 *   CompanyShell (data fetch + auth guard)
 *   └── CompanyContext.Provider
 *       ├── CompanyDashboard  (view="dashboard")
 *       ├── CompanyJobList    (view="jobs")
 *       ├── NewJobForm        (view="new-job")
 *       └── CompanyBilling    (view="billing")
 */

import {
  createContext, useContext, useEffect, useState,
  type ReactNode
} from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { createBrowserSupabase } from "@/lib/supabase/client";
import { getCompanyActivePlan } from "@/lib/queries/account";
import type { Company, Job, JobApplication, LookupItem, Order, Plan } from "@/types/domain";

export type ActivePlanSummary = {
  plan_name: string;
  active_jobs_limit: number;
  active_until: string | null;
  is_active: boolean;
};

export type CompanyContextValue = {
  // Data
  company: Company | null;
  jobs: Job[];
  applications: JobApplication[];
  plans: Plan[];
  cities: LookupItem[];
  categories: LookupItem[];
  orders: Order[];
  activePlan: ActivePlanSummary | null;
  email: string;
  userId: string | null;

  // Status
  loading: boolean;
  notice: { text: string; type: "info" | "error" | "success" } | null;

  // Actions
  setCompany: (c: Company | null) => void;
  setJobs: (jobs: Job[]) => void;
  setNotice: (n: { text: string; type: "info" | "error" | "success" } | null) => void;
  setMsg: (text: string, type?: "info" | "error" | "success") => void;
  reload: () => Promise<void>;
};

const CompanyContext = createContext<CompanyContextValue | null>(null);

export function useCompany(): CompanyContextValue {
  const ctx = useContext(CompanyContext);
  if (!ctx) throw new Error("useCompany must be used inside CompanyShell");
  return ctx;
}

interface CompanyShellProps {
  children: ReactNode;
}

/**
 * CompanyShell — auth guard + data loader.
 * Wrap each company page with this to get CompanyContext.
 */
export function CompanyShell({ children }: CompanyShellProps) {
  const { role, userId, email: authEmail, ready } = useAuth();
  const router = useRouter();

  const [company, setCompany] = useState<Company | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [cities, setCities] = useState<LookupItem[]>([]);
  const [categories, setCategories] = useState<LookupItem[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [activePlan, setActivePlan] = useState<ActivePlanSummary | null>(null);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<{ text: string; type: "info" | "error" | "success" } | null>(null);

  const supabase = createBrowserSupabase();

  function setMsg(text: string, type: "info" | "error" | "success" = "info") {
    setNotice({ text, type });
  }

  async function reload() {
    if (!ready || !userId || (role !== "company" && role !== "admin")) return;

    setLoading(true);
    setEmail(authEmail || "");

    const [cityRows, categoryRows, planRows, companyResult] = await Promise.all([
      supabase.from("cities").select("id,name,slug").order("name"),
      supabase.from("categories").select("id,name,slug").order("name"),
      supabase.from("plans").select("*").eq("is_active", true).order("price_eur"),
      supabase.from("companies").select("*").eq("owner_id", userId).order("created_at"),
    ]);

    const myCompany = ((companyResult.data || []) as Company[])[0] ?? null;
    setCities((cityRows.data || []) as LookupItem[]);
    setCategories((categoryRows.data || []) as LookupItem[]);
    setPlans((planRows.data || []) as Plan[]);
    setCompany(myCompany);

    if (myCompany) {
      const [jobRows, appRows, orderRows, planData] = await Promise.all([
        supabase
          .from("jobs")
          .select("*,companies(id,name,slug),categories(id,name),cities(id,name)")
          .eq("company_id", myCompany.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("job_applications")
          .select("*,jobs!inner(id,title,company_id),profiles(full_name,email,phone,city,cv_data,cv_updated_at)")
          .eq("jobs.company_id", myCompany.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("orders")
          .select("*,plans(name),companies(name)")
          .eq("company_id", myCompany.id)
          .order("created_at", { ascending: false }),
        getCompanyActivePlan(myCompany.id),
      ]);

      setJobs((jobRows.data || []) as Job[]);
      setApplications((appRows.data || []) as JobApplication[]);
      setOrders((orderRows.data || []) as Order[]);
      setActivePlan(planData
        ? {
            plan_name: planData.plan_name,
            active_jobs_limit: planData.active_jobs_limit,
            active_until: planData.active_until,
            is_active: planData.is_active,
          }
        : null
      );
    }

    setLoading(false);
  }

  useEffect(() => {
    if (!ready) return;
    if (!userId || role === "guest") {
      router.replace(`/login?next=${encodeURIComponent(window.location.pathname)}`);
      return;
    }
    if (role !== "company" && role !== "admin") {
      router.replace("/profil");
      return;
    }
    reload();
  }, [ready, userId, role]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!ready || loading) {
    return (
      <div className="app-shell">
        <div className="loading-panel" style={{ gridColumn: "1/-1" }}>
          <p>Učitavanje...</p>
        </div>
      </div>
    );
  }

  const value: CompanyContextValue = {
    company, jobs, applications, plans, cities, categories,
    orders, activePlan, email, userId,
    loading, notice,
    setCompany, setJobs, setNotice, setMsg, reload,
  };

  return (
    <CompanyContext.Provider value={value}>
      {children}
    </CompanyContext.Provider>
  );
}
