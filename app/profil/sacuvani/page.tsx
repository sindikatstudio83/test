import type { Metadata } from "next";
import { SavedJobsClient } from "@/components/saved-jobs-client";

export const metadata: Metadata = {
  title: "Sačuvani oglasi",
  description: "Pregled sačuvanih oglasa."
};

export default function SacuvaniPage() {
  return <SavedJobsClient />;
}
