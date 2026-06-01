import type { Metadata } from "next";
import { CompanyCard } from "@/components/company-card";
import { BannerSlot } from "@/components/banner-slot";
import { EmptyState, SectionHead } from "@/components/ui";
import { getCompanies } from "@/lib/queries/public";

export const metadata: Metadata = {
  title: "Poslodavci",
  description: "Lista odobrenih poslodavaca i firmi na imaposla.me."
};

export default async function CompaniesPage() {
  const companies = await getCompanies();
  return (
    <>
      <BannerSlot placement="company_pages_top" />
      <SectionHead label="Firme" title="Poslodavci" text="Firme koje imaju javni profil na platformi." />
      <div className="grid two">
        {companies.map((c) => <CompanyCard company={c} key={c.id} />)}
        {!companies.length ? <EmptyState title="Nema firmi" text="Firme se prikazuju nakon odobrenja." /> : null}
      </div>
      <BannerSlot placement="company_pages_bottom" />
    </>
  );
}
