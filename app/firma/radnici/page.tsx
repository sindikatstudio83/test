import type { Metadata } from "next";
import { FirmaRadniciClient } from "@/components/firma-radnici-client";

export const metadata: Metadata = {
  title: "Dostupni radnici",
  robots: { index: false, follow: false },
};

type Props = {
  searchParams: Promise<{ profession?: string; city?: string; availability?: string }>;
};

export default async function FirmaRadniciPage({ searchParams }: Props) {
  const params = await searchParams;
  return <FirmaRadniciClient profession={params.profession} city={params.city} availability={params.availability} />;
}
