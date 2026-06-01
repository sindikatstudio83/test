import type { Metadata } from "next";
import { AdminBrziAngazmaniClient } from "@/components/admin-brzi-angazmani-client";

export const metadata: Metadata = {
  title: "Brzi angažmani",
  robots: { index: false, follow: false },
};

export default function AdminBrziAngazmaniPage() {
  return <AdminBrziAngazmaniClient />;
}
