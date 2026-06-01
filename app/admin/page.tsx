import type { Metadata } from "next";
import { AdminClient } from "@/components/admin-client";

export const metadata: Metadata = { title: "Admin — Pregled" };

export default function AdminPage() {
  return <AdminClient view="dashboard" />;
}
