"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { createBrowserSupabase } from "@/lib/supabase/client";
import { logError } from "@/lib/errors";
import { formatDate } from "@/lib/format";
import type { WorkerMessage } from "@/types/domain";

export function BrziKontaktiClient() {
  const { userId, ready, role } = useAuth();
  const router = useRouter();
  const [messages, setMessages] = useState<WorkerMessage[]>([]);
  const [hasProfile, setHasProfile] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ready) return;
    if (!userId || role === "guest") {
      router.replace("/login?next=/profil/brzi-kontakti");
      return;
    }

    async function load() {
      const supabase = createBrowserSupabase();
      const { data: worker } = await supabase
        .from("worker_profiles")
        .select("id")
        .eq("user_id", userId!)
        .maybeSingle();

      if (!worker) {
        setHasProfile(false);
        setLoading(false);
        return;
      }
      setHasProfile(true);

      const { data, error } = await supabase
        .from("worker_messages")
        .select("*")
        .eq("worker_id", worker.id)
        .order("created_at", { ascending: false });

      if (error) logError("BrziKontakti.load", error);
      setMessages((data || []) as WorkerMessage[]);

      // Mark unread as read
      const unread = (data || []).filter((m: WorkerMessage) => !m.is_read).map((m: WorkerMessage) => m.id);
      if (unread.length) {
        await supabase.from("worker_messages").update({ is_read: true }).in("id", unread);
      }
      setLoading(false);
    }
    load();
  }, [ready, userId, role, router]);

  if (!ready || loading) return <div className="empty"><strong>Učitavanje...</strong></div>;

  return (
    <section style={{ maxWidth: 720, margin: "0 auto", padding: "16px 0" }}>
      <div className="section-head">
        <div>
          <span className="page-label">Brzi poslovi</span>
          <h1>Upiti za mene</h1>
          <p className="sub">Upiti koje su ti poslali poslodavci i korisnici.</p>
        </div>
      </div>

      {!hasProfile ? (
        <div className="bp-empty">
          <strong>Nemaš brzi profil</strong>
          <p>Napravi brzi profil da bi te poslodavci mogli kontaktirati.</p>
          <Link className="btn blue" href="/profil/brzi-profil">Napravi brzi profil →</Link>
        </div>
      ) : messages.length === 0 ? (
        <div className="bp-empty">
          <strong>Još nema upita</strong>
          <p>Kad te neko kontaktira, poruka će se pojaviti ovdje.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {messages.map(m => (
            <div key={m.id} className="form-card" style={{ padding: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, marginBottom: 8, flexWrap: "wrap" }}>
                <strong style={{ fontSize: 15 }}>{m.from_name || "Korisnik"}</strong>
                <span style={{ fontSize: 12, color: "var(--muted)" }}>{formatDate(m.created_at, { withTime: true })}</span>
              </div>
              <p style={{ fontSize: 14, lineHeight: 1.6, margin: "0 0 10px", overflowWrap: "anywhere" }}>{m.message}</p>
              {m.from_contact && (
                <div className="bp-contact-row" style={{ fontSize: 13, padding: "6px 0 0", borderTop: "1px solid var(--line)" }}>
                  <span aria-hidden>📞</span><span style={{ overflowWrap: "anywhere" }}>{m.from_contact}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
