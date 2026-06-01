import type { Metadata } from "next";
import { AdminClient } from "@/components/admin-client";

export const metadata: Metadata = { title: "Admin — Firme" };

export default function AdminFirmePage() {
  return <AdminClient view="companies" />;
}
