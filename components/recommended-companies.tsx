import Link from "next/link";
import { Avatar } from "@/components/avatar";
import { companyUrl } from "@/lib/format";
import type { CompanyWithExtras } from "@/types/domain";

interface Props {
  companies: CompanyWithExtras[];
}

export function RecommendedCompanies({ companies }: Props) {
  if (!companies.length) return null;

  return (
    <div className="recommended-companies">
      {companies.map((c) => (
        <Link
          key={c.id}
          href={companyUrl(c)}
          className={`rec-company-card${c.recommended ? " rec-company-card--star" : ""}`}
        >
          {/* Logo — 52px, centered */}
          <div className="rec-company-logo">
            <Avatar bucket="company-logos" path={c.logo_path} fallback={c.name} size={48} shape="rounded" />
          </div>
          <div className="rec-company-info" style={{ width: "100%", minWidth: 0 }}>
            <span className="rec-company-name">{c.name}</span>
            {(c.city || c.industry) && (
              <span className="rec-company-meta">
                {[c.city, c.industry].filter(Boolean).join(" · ")}
              </span>
            )}
          </div>
          {c.recommended && <span className="rec-company-badge">★</span>}
        </Link>
      ))}
    </div>
  );
}
