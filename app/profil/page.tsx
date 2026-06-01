import type { Metadata } from "next";
import { DashboardClient } from "@/components/dashboard-client";

export const metadata: Metadata = {
  title: "Moj profil"
};

export default function ProfilePage() {
  return <DashboardClient expectedRole="candidate" title="Moj profil" />;
}
