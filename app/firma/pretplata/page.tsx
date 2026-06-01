import type { Metadata } from "next";
import { CompanyClient } from "@/components/company-client";

export const metadata: Metadata = { title: "Pretplata i uplate" };

export default function PretplataPage() {
  return <CompanyClient view="billing" />;
}
