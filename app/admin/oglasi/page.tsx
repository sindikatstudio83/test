import type { Metadata } from "next";
import { AdminClient } from "@/components/admin-client";

export const metadata: Metadata = { title: "Admin — Oglasi" };

export default function AdminOglasiPage() {
  return <AdminClient view="jobs" />;
}
