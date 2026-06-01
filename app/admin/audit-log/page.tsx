import type { Metadata } from "next";
import { AdminAuditLogClient } from "@/components/admin-audit-log-client";

export const metadata: Metadata = { title: "Audit log" };

export default function AdminAuditLogPage() {
  return <AdminAuditLogClient />;
}
