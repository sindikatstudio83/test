import Link from "next/link";
import { companyUrl } from "@/lib/format";
import { Avatar } from "@/components/avatar";
import type { Company } from "@/types/domain";

export function CompanyCard({ company }: { company: Company }) {
  const url = companyUrl(company);
  return (
    <article className="nh-company-card">
      <div className="nh-company-logo">
        <Avatar bucket="company-logos" path={company.logo_path} fallback={company.name} size={96} shape="rounded" />
      </div>
      <div className="nh-company-body">
        <h3><Link href={url}>{company.name}</Link></h3>
        <div className="nh-card-meta">
          {company.city && <span>{company.city}</span>}
          {company.industry && <span>{company.industry}</span>}
        </div>
        {company.description && <p>{company.description}</p>}
      </div>
      <Link className="nh-outline-btn nh-card-btn" href={url}>Profil firme</Link>
    </article>
  );
}
