import type { Metadata } from "next";
import { JobAlertsClient } from "@/components/job-alerts-client";

export const metadata: Metadata = {
  title: "Upozorenja za nove oglase",
  robots: { index: false, follow: false }
};

export default function UpozorenjaPage() {
  return <JobAlertsClient />;
}
