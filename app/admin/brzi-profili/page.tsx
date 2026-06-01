import type { Metadata } from "next";
import { AdminBrziProfiliClient } from "@/components/admin-brzi-profili-client";

export const metadata: Metadata = {
  title: "Brzi profili",
  robots: { index: false, follow: false },
};

export default function AdminBrziProfiliPage() {
  return <AdminBrziProfiliClient />;
}
