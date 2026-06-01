"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { createBrowserSupabase } from "@/lib/supabase/client";
import { safeMessage, logError } from "@/lib/errors";
import { DashboardSideNav } from "@/components/dashboard-side-nav";
import { formatDate } from "@/lib/format";
import type { WorkerMessage } from "@/types/domain";

type MsgRow = WorkerMessage & {
  worker_profiles?: { id: number; display_name: string } | null;
};

export function AdminBrziKontaktiClient() {
  const { role, ready } = useAuth();
  const router = useRouter();
  const supabase = createBrowserSupabase();
  const [rows, setRows] = useState<MsgRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<{ text: string; type: "error" | "info" } | null>(null);
  const [email, setEmail] = useState("");

  useEffect(() => {
    if (!ready) return;
    if (role !== "admin") { router.replace("/"); return; }

    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setEmail(user.email || "");

      const { data, error } = await supabase
        .from("worker_messages")
        .select("*,worker_profiles(id,display_name)")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) { logError("AdminBrziKontakti.load", error); setNotice({ text: safeMessage(error, "load"), type: "error" }); }
      else setRows((data || []) as MsgRow[]);
      setLoading(false);
    }
    load();
  }, [ready, role]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!ready || role !== "admin") return <div className="loading-panel">Provjera pristupa...</div>;

  return (
    <div className="app-shell">
      <DashboardSideNav role="admin" email={email} />
      <main className="app-main">
        <div className="section-head">
          <div>
            <span className="page-label">Admin · Brzi poslovi</span>
            <h1>Kontakti radnika</h1>
            <p className="sub">Sve poruke poslate radnicima preko platforme.</p>
          </div>
        </div>

        {notice && <p className={`notice ${notice.type}`} style={{ marginBottom: 14 }}>{notice.text}</p>}

        {loading ? (
          <div className="empty"><strong>Učitavanje...</strong></div>
        ) : rows.length === 0 ? (
          <div className="bp-empty"><strong>Još nema poruka</strong></div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {rows.map(m => (
              <div key={m.id} className="form-card" style={{ padding: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", marginBottom: 6 }}>
                  <strong style={{ overflowWrap: "anywhere" }}>
                    {m.from_name || "Korisnik"} → {m.worker_profiles?.display_name || `Radnik #${m.worker_id}`}
                  </strong>
                  <span style={{ fontSize: 12, color: "var(--muted)" }}>{formatDate(m.created_at, { withTime: true })}</span>
                </div>
                <p style={{ fontSize: 14, lineHeight: 1.5, margin: "0 0 6px", overflowWrap: "anywhere" }}>{m.message}</p>
                {m.from_contact && (
                  <span style={{ fontSize: 12, color: "var(--muted)" }}>Kontakt: {m.from_contact}</span>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
