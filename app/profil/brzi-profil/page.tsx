import type { Metadata } from "next";
import { BrziProfilClient } from "@/components/brzi-profil-client";

export const metadata: Metadata = {
  title: "Moja ponuda usluga",
  robots: { index: false, follow: false },
};

export default function BrziProfilPage() {
  return <BrziProfilClient />;
}
