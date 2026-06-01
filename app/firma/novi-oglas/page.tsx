import type { Metadata } from "next";
import { CompanyClient } from "@/components/company-client";

export const metadata: Metadata = { title: "Novi oglas" };

export default function NoviOglasPage() {
  return <CompanyClient view="new-job" />;
}
