import type { Metadata } from "next";
import { FirmaGigApplicationsClient } from "@/components/firma-gig-applications-client";

export const metadata: Metadata = {
  title: "Prijave na angažman",
  robots: { index: false, follow: false },
};

export default async function FirmaGigApplicationsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <FirmaGigApplicationsClient gigId={Number(id)} />;
}
