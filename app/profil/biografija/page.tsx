import type { Metadata } from "next";
import { CvBuilder } from "@/components/cv-builder";

export const metadata: Metadata = {
  title: "Moja biografija"
};

export default function BiografijaPage() {
  return <CvBuilder />;
}
