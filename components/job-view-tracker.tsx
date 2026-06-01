"use client";

import { useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { trackJobView } from "@/lib/queries/account";

export function JobViewTracker({ jobId }: { jobId: number }) {
  const { userId, ready } = useAuth();

  useEffect(() => {
    if (!ready) return;
    // Track samo jednom po session-u
    try {
      const key = `viewed_${jobId}`;
      if (window.sessionStorage.getItem(key)) return;
      window.sessionStorage.setItem(key, "1");
      trackJobView(jobId, userId);
    } catch {
      // session storage može da blokira
    }
  }, [ready, jobId, userId]);

  return null;
}
