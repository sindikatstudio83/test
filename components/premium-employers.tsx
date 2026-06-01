import Link from "next/link";
import { Avatar } from "@/components/avatar";
import { companyUrl } from "@/lib/format";
import type { Company } from "@/types/domain";

type PremiumEmployer = Pick<Company, "id" | "name" | "slug" | "city" | "industry" | "description" | "logo_path"> & {
  recommended?: boolean | null;
};

export function PremiumEmployers({ companies }: { companies: PremiumEmployer[] }) {
  if (!companies.length) return null;

  const loop = companies.length > 1 ? [...companies, ...companies] : companies;

  return (
    <div className="premium-employers" aria-label="Premium poslodavci">
      <div className="premium-employers__track">
        {loop.map((company, index) => (
          <Link
            key={`${company.id}-${index}`}
            href={companyUrl(company as Company)}
            className="premium-employer-card"
          >
            <div className="premium-employer-card__logo">
              <Avatar
                bucket="company-logos"
                path={company.logo_path}
                fallback={company.name}
                size={52}
                shape="rounded"
              />
            </div>
            <div className="premium-employer-card__body">
              <span className="premium-employer-card__eyebrow">
                {company.recommended ? "Premium poslodavac" : "Aktivan poslodavac"}
              </span>
              <strong>{company.name}</strong>
              <span>{[company.city, company.industry].filter(Boolean).join(" · ") || "Profil firme"}</span>
            </div>
            <span className="premium-employer-card__cta">Profil</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
