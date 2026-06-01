import type { Metadata } from "next";
import { BrziKontaktiClient } from "@/components/brzi-kontakti-client";

export const metadata: Metadata = {
  title: "Upiti za mene",
  robots: { index: false, follow: false },
};

export default function BrziKontaktiPage() {
  return <BrziKontaktiClient />;
}
