import type { Metadata } from "next";
import { AdminBannerRequestsClient } from "@/components/admin-banner-requests-client";

export const metadata: Metadata = { title: "Admin — Banner zahtjevi" };

export default function AdminBannerZahtjeviPage() {
  return <AdminBannerRequestsClient />;
}
