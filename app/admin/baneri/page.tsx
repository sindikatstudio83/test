import type { Metadata } from "next";
import { AdminBannersClient } from "@/components/admin-banners-client";

export const metadata: Metadata = { title: "Reklamni baneri", description: "Upravljanje banerima." };

export default function AdminBannersPage() {
  return <AdminBannersClient />;
}
