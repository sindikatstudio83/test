"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabase } from "@/lib/supabase/client";
import { safeMessage, logError } from "@/lib/errors";
import { formatDate } from "@/lib/format";
import { useAuth } from "@/lib/auth-context";
import { DashboardSideNav } from "@/components/dashboard-side-nav";

type AuditRow = {
  id: number;
  admin_email: string | null;
  action: string;
  target_table: string | null;
  target_id: string | null;
  old_value: Record<string, unknown> | null;
  new_value: Record<string, unknown> | null;
  note: string | null;
  created_at: string;
};

function compactJson(value: Record<string, unknown> | null) {
  if (!value) return "-";
  return JSON.stringify(value);
}

export function AdminAuditLogClient() {
  const { role, email: authEmail, ready } = useAuth();
  const router = useRouter();
  const supabase = useMemo(() => createBrowserSupabase(), []);
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);
  const [email] = useState(() => authEmail ?? "");

  // Auth guard — consistent with other admin components
  useEffect(() => {
    if (!ready) return;
    if (role !== "admin") {
      router.replace("/");
    }
  }, [ready, role, router]);

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setNotice(null);

      const { data, error } = await supabase.rpc("admin_read_audit_log", {
        p_limit: 80,
        p_offset: 0,
        p_action: null,
        p_table: null,
      });

      if (!active) return;
      if (error) {
        logError("AdminAuditLog.load", error);
        setRows([]);
        setNotice(safeMessage(error, "load"));
      } else {
        setRows((data || []) as AuditRow[]);
      }
      setLoading(false);
    }

    load();
    return () => {
      active = false;
    };
  }, [supabase]);

  if (!ready || role !== "admin") {
    return <div className="loading-panel">Provjera pristupa...</div>;
  }

  return (
    <div className="app-shell">
      <DashboardSideNav role="admin" email={email} />
      <main className="app-main">
      <section className="admin-audit-page">
      <div className="page-head">
        <div>
          <span className="page-label">Admin</span>
          <h1>Audit log</h1>
          <p className="sub">Pregled zadnjih administrativnih promjena i sigurnosnih akcija.</p>
        </div>
        <div className="head-actions">
          <Link className="btn ghost sm" href="/admin">Admin pregled</Link>
        </div>
      </div>

      {notice ? <div className="notice error">{notice}</div> : null}

      <div className="table-wrap">
        <table className="data-table audit-table">
          <thead>
            <tr>
              <th>Vrijeme</th>
              <th>Akcija</th>
              <th>Meta</th>
              <th>Admin</th>
              <th>Prije</th>
              <th>Poslije</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6}>Učitavanje audit loga...</td>
              </tr>
            ) : rows.length ? (
              rows.map((row) => (
                <tr key={row.id}>
                  <td>{formatDate(row.created_at, { withTime: true })}</td>
                  <td><span className="status-badge stage-review">{row.action}</span></td>
                  <td>{row.target_table || "-"}{row.target_id ? ` #${row.target_id}` : ""}</td>
                  <td>{row.admin_email || "Sistem"}</td>
                  <td><code>{compactJson(row.old_value)}</code></td>
                  <td><code>{compactJson(row.new_value)}</code></td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6}>Nema zapisa za prikaz.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
    </main>
    </div>
  );
}
