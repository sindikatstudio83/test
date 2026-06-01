import type { Metadata } from "next";
import { CompanyClient } from "@/components/company-client";

export const metadata: Metadata = { title: "Moji oglasi" };

export default function FirmaOglasiPage() {
  return <CompanyClient view="jobs" />;
}
