import { LogoutClient } from "@/components/logout-client";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Odjava",
  robots: { index: false, follow: false },
};



export default function LogoutPage() {
  return <LogoutClient />;
}
