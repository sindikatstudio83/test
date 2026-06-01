import type { Metadata } from "next";
import { CandidateProfileView } from "@/components/candidate-profile-view";

export const metadata: Metadata = { title: "Profil kandidata — imaposla.me" };

export default async function CandidateProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <CandidateProfileView candidateId={id} />;
}
