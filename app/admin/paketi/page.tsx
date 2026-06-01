import type { Metadata } from "next";
import { AdminPaketiClient } from "@/components/admin-paketi-client";

export const metadata: Metadata = { title: "Admin — Paketi pretplate" };

export default function AdminPaketiPage() {
  return <AdminPaketiClient />;
}
