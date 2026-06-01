import Link from "next/link";
import { companyUrl } from "@/lib/format";
import { Avatar } from "@/components/avatar";
import type { Company } from "@/types/domain";

export function CompanyCard({ company }: { company: Company }) {
  const url = companyUrl(company);
  return (
    <article className="company-card">
      {/* Logo — 56px, stable */}
      <div className="logo" style={{ flexShrink: 0 }}>
        <Avatar bucket="company-logos" path={company.logo_path} fallback={company.name} size={52} shape="rounded" />
      </div>
      <div style={{ minWidth: 0, flex: 1 }}>
        <h3 style={{ fontSize: 16, marginBottom: 3, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          <Link href={url}>{company.name}</Link>
        </h3>
        <div className="meta" style={{ margin: "3px 0 6px" }}>
          {company.city && <span>{company.city}</span>}
          {company.industry && <span>· {company.industry}</span>}
        </div>
        {company.description && (
          <p style={{ color: "var(--muted)", lineHeight: 1.55, margin: 0, fontSize: 13,
            display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
            {company.description}
          </p>
        )}
        <div style={{ marginTop: 10 }}>
          <Link className="btn ghost sm" href={url}>Profil firme →</Link>
        </div>
      </div>
    </article>
  );
}
