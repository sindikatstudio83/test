import type { Metadata } from "next";
import { CvUnlockClient } from "@/components/cv-unlock-client";

export const metadata: Metadata = { title: "Firma — Baza kandidata" };

export default function FirmaKandidatiPage() {
  return <CvUnlockClient />;
}
