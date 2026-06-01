"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { saveJob, unsaveJob, isSaved } from "@/lib/queries/account";

export function SaveJobButton({ jobId, size = "sm" }: { jobId: number; size?: "sm" | "md" }) {
  const { userId, role } = useAuth();
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId || role !== "candidate") { setLoading(false); return; }
    isSaved(userId, jobId).then(s => { setSaved(s); setLoading(false); });
  }, [userId, role, jobId]);

  if (!userId || role !== "candidate") return null;

  async function toggle() {
    if (!userId) return;
    setLoading(true);
    if (saved) {
      const ok = await unsaveJob(userId, jobId);
      if (ok) setSaved(false);
    } else {
      const ok = await saveJob(userId, jobId);
      if (ok) setSaved(true);
    }
    setLoading(false);
  }

  return (
    <button
      type="button"
      className={`btn ghost ${size}`}
      onClick={toggle}
      disabled={loading}
      title={saved ? "Ukloni iz sačuvanih" : "Sačuvaj oglas"}
      aria-pressed={saved}
    >
      {saved ? "★ Sačuvano" : "☆ Sačuvaj"}
    </button>
  );
}
