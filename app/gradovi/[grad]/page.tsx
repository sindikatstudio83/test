import type { Metadata } from "next";
import { JobCardClean } from "@/components/job-card-clean";
import { BannerSlot } from "@/components/banner-slot";
import { EmptyState, SectionHead } from "@/components/ui";
import { getPublicJobsByCity } from "@/lib/queries/public";

type Props = { params: Promise<{ grad: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { grad } = await params;
  const city = decodeURIComponent(grad);
  return {
    title: `Poslovi: ${city}`,
    description: `Oglasi za posao u gradu ${city}, Crna Gora.`
  };
}

export default async function CityJobsPage({ params }: Props) {
  const { grad } = await params;
  const city = decodeURIComponent(grad);
  const jobs = await getPublicJobsByCity(city);
  return (
    <>
      <BannerSlot placement="city_page_top" />
      <SectionHead label="Grad" title={`Poslovi: ${city}`} text="Aktivni oglasi za izabrani grad." />
      <div className="job-list">
        {jobs.map((job) => <JobCardClean job={job} key={job.id} />)}
        {!jobs.length ? <EmptyState title="Nema oglasa" text="Za ovaj grad trenutno nema aktivnih oglasa." /> : null}
      </div>
    </>
  );
}
