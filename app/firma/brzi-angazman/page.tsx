import type { Metadata } from "next";
import { BrziAngazmanClient } from "@/components/brzi-angazman-client";

export const metadata: Metadata = {
  title: "Brzi angažman",
  robots: { index: false, follow: false },
};

export default function FirmaBrziAngazmanPage() {
  return <BrziAngazmanClient />;
}
