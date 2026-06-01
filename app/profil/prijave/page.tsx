import type { Metadata } from "next";
import { ApplicationsClient } from "@/components/applications-client";

export const metadata: Metadata = {
  title: "Moje prijave"
};

export default function ApplicationsPage() {
  return <ApplicationsClient />;
}
