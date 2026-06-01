import type { Metadata } from "next";
import { AdminBrziKontaktiClient } from "@/components/admin-brzi-kontakti-client";

export const metadata: Metadata = {
  title: "Kontakti radnika",
  robots: { index: false, follow: false },
};

export default function AdminBrziKontaktiPage() {
  return <AdminBrziKontaktiClient />;
}
