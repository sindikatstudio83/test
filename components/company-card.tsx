import Link from "next/link";
import { companyUrl } from "@/lib/format";
import { Avatar } from "@/components/avatar";
import type { Company } from "@/types/domain";

export function CompanyCard({ company }: { company: Company }) {
  const url = companyUrl(company);
  return (
    <article className="comp-card nx-company-card">
      <Link className="comp-logo-circle nx-company-logo" href={url} aria-label={company.name}>
        <div className="comp-dot" />
        <Avatar bucket="company-logos" path={company.logo_path} fallback={company.name} size={76} shape="rounded" />
      </Link>
      <div className="nh-company-body">
        <h3 className="comp-name"><Link href={url}>{company.name}</Link></h3>
        <div className="jlist-meta nx-company-meta">
          {company.city && <span>{company.city}</span>}
          {company.industry && <span>{company.industry}</span>}
        </div>
        {company.description && <p className="comp-desc">{company.description}</p>}
      </div>
      <Link className="open-pill" href={url}>Profil firme</Link>
    </article>
  );
}
