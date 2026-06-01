import type { Metadata } from "next";
import { CompanyShell } from "@/lib/company-context";
import { CompanyDashboard } from "@/components/company-dashboard";

export const metadata: Metadata = { title: "Pregled firme" };

export default function FirmaDashboardPage() {
  return (
    <CompanyShell>
      <CompanyDashboard />
    </CompanyShell>
  );
}
