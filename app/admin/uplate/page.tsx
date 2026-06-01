import type { Metadata } from "next";
import { AdminClient } from "@/components/admin-client";

export const metadata: Metadata = { title: "Admin — Uplate" };

export default function AdminUplatePage() {
  return <AdminClient view="payments" />;
}
