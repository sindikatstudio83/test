"use client";

import { useEffect } from "react";
import { createBrowserSupabase } from "@/lib/supabase/client";

/** Best-effort view counter — once per session per worker. */
export function WorkerViewTracker({ workerId }: { workerId: number }) {
  useEffect(() => {
    try {
      const key = `viewed_worker_${workerId}`;
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
      const supabase = createBrowserSupabase();
      supabase.rpc("increment_worker_view", { p_worker_id: workerId });
    } catch {
      // best-effort — silent fail
    }
  }, [workerId]);

  return null;
}
