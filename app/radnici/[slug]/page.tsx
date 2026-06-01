import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { WorkerDetailView } from "@/components/worker-detail-view";
import { getWorkerBySlug } from "@/lib/queries/brzi-poslovi";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const worker = await getWorkerBySlug(slug);
  if (!worker) return { title: "Radnik nije pronađen" };
  const profession = worker.professions?.name || worker.profession_text || "Radnik";
  const cityLabel = worker.cities[0] || "Crna Gora";
  const title = `${worker.display_name} — ${profession}, ${cityLabel}`;
  const description = worker.bio?.slice(0, 160) || `${profession} dostupan za angažman u ${cityLabel}.`;
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "profile",
      images: [{
        url: `/og-image?title=${encodeURIComponent(worker.display_name)}&subtitle=${encodeURIComponent(profession)}`,
        width: 1200, height: 630, alt: title,
      }],
    },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function PremiumWorkerPage({ params }: Props) {
  const { slug } = await params;
  const worker = await getWorkerBySlug(slug);
  if (!worker) return notFound();
  return <WorkerDetailView worker={worker} />;
}
