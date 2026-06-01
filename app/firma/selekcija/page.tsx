import type { Metadata } from "next";
import { AtsClient } from "@/components/ats-client";

export const metadata: Metadata = { title: "Selekcija prijava" };

export default function SelekcijaPage() {
  return <AtsClient />;
}
