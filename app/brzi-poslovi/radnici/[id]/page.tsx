import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { WorkerDetailView } from "@/components/worker-detail-view";
import { getWorkerById } from "@/lib/queries/brzi-poslovi";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const worker = await getWorkerById(Number(id));
  if (!worker) return { title: "Radnik nije pronađen" };
  const profession = worker.professions?.name || worker.profession_text || "Radnik";
  return {
    title: `${worker.display_name} — ${profession}`,
    description: worker.bio?.slice(0, 160) || `${profession} dostupan za brzi angažman u Crnoj Gori.`,
    robots: worker.is_premium ? undefined : { index: false, follow: true },
  };
}

export default async function WorkerByIdPage({ params }: Props) {
  const { id } = await params;
  const worker = await getWorkerById(Number(id));
  if (!worker) return notFound();
  return <WorkerDetailView worker={worker} />;
}
