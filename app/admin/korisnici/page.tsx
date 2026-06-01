import type { Metadata } from "next";
import { AdminClient } from "@/components/admin-client";

export const metadata: Metadata = { title: "Admin — Korisnici" };

export default function AdminKorisniciPage() {
  return <AdminClient view="users" />;
}
