import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { JobCardClean } from "@/components/job-card-clean";
import { Badge, Button, EmptyState, SectionHead } from "@/components/ui";
import { BannerSlot } from "@/components/banner-slot";
import { parseIdFromSlug } from "@/lib/format";
import { getCompanyById, getPublicJobsByCompany } from "@/lib/queries/public";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const id = parseIdFromSlug(slug);
  if (!id) return { title: "Firma nije pronađena" };
  const company = await getCompanyById(id);
  if (!company) return { title: "Firma nije pronađena" };

  const description = company.description?.slice(0, 160) || `Profil firme ${company.name} na imaposla.me.`;

  return {
    title: company.name,
    description,
    openGraph: {
      title: company.name,
      description,
      images: [
        {
          url: `/og-image?title=${encodeURIComponent(company.name)}&subtitle=${encodeURIComponent(company.city || "Crna Gora")}`,
          width: 1200,
          height: 630,
          alt: company.name
        }
      ]
    },
    twitter: {
      card: "summary_large_image",
      title: company.name,
      description
    }
  };
}

export default async function CompanyDetailPage({ params }: Props) {
  const { slug } = await params;
  const id = parseIdFromSlug(slug);
  if (!id) return notFound();
  const [company, companyJobs] = await Promise.all([getCompanyById(id), getPublicJobsByCompany(id)]);
  if (!company) return notFound();

  return (
    <>
      <BannerSlot placement="company_pages_top" />
      <Button href="/firme" size="sm">Nazad na firme</Button>
      <div className="panel with-top-space">
        <span className="eyebrow">Profil firme</span>
        <h1>{company.name}</h1>
        <p className="lead">{company.description || "Profil poslodavca."}</p>
        <div className="tags">
          <Badge tone="lime">{company.city || "Crna Gora"}</Badge>
          <Badge>{company.industry || "Poslodavac"}</Badge>
        </div>
      </div>
      <SectionHead title="Aktivni oglasi" text="Svi javni oglasi ovog poslodavca." />
      <div className="job-list">
        {companyJobs.map((job) => <JobCardClean job={job} key={job.id} />)}
        {!companyJobs.length ? <EmptyState title="Nema aktivnih oglasa" text="Ova firma trenutno nema javno aktivnih oglasa." /> : null}
      </div>
      <BannerSlot placement="company_pages_bottom" />
    </>
  );
}
