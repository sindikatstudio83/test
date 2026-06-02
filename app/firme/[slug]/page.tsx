import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Avatar } from "@/components/avatar";
import { JobCardClean } from "@/components/job-card-clean";
import { BannerSlot } from "@/components/banner-slot";
import { parseIdFromSlug } from "@/lib/format";
import { getCompanyById, getPublicJobsByCompany } from "@/lib/queries/public";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const id = parseIdFromSlug(slug);
  if (!id) return { title: "Firma nije pronadjena" };
  const company = await getCompanyById(id);
  if (!company) return { title: "Firma nije pronadjena" };
  const description = company.description?.slice(0, 160) || `Profil firme ${company.name} na imaposla.me.`;
  return { title: company.name, description };
}

export default async function CompanyDetailPage({ params }: Props) {
  const { slug } = await params;
  const id = parseIdFromSlug(slug);
  if (!id) return notFound();
  const [company, companyJobs] = await Promise.all([getCompanyById(id), getPublicJobsByCompany(id)]);
  if (!company) return notFound();

  return (
    <section className="nh-page">
      <div className="nh-company-hero">
        <div className="nh-container nh-company-hero-grid">
          <div className="nh-company-hero-logo">
            <Avatar bucket="company-logos" path={company.logo_path} fallback={company.name} size={156} shape="rounded" />
          </div>
          <div>
            <Link className="nh-back" href="/firme">Nazad na firme</Link>
            <span className="nh-pill">Profil firme</span>
            <h1>{company.name}</h1>
            <p>{company.description || "Profil poslodavca."}</p>
            <div className="nh-chip-row">
              <span className="nh-chip">{company.city || "Crna Gora"}</span>
              <span className="nh-chip">{company.industry || "Poslodavac"}</span>
              <span className="nh-chip nh-chip-red">{companyJobs.length} aktivnih oglasa</span>
            </div>
          </div>
        </div>
      </div>

      <div className="nh-container"><BannerSlot placement="company_pages_top" /></div>

      <div className="nh-container nh-section-head">
        <div>
          <span className="nh-small-label">Otvorene pozicije</span>
          <h2>Aktivni oglasi</h2>
          <p>Svi javni oglasi ovog poslodavca.</p>
        </div>
      </div>

      {companyJobs.length ? (
        <div className="nh-container nh-job-grid">
          {companyJobs.map((job) => <JobCardClean job={job} key={job.id} />)}
        </div>
      ) : (
        <div className="nh-container">
          <div className="nh-empty">
            <strong>Nema aktivnih oglasa</strong>
            <p>Ova firma trenutno nema javno aktivnih oglasa.</p>
          </div>
        </div>
      )}

      <div className="nh-container"><BannerSlot placement="company_pages_bottom" /></div>
    </section>
  );
}
