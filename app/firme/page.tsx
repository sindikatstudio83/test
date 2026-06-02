import type { Metadata } from "next";
import { CompanyCard } from "@/components/company-card";
import { BannerSlot } from "@/components/banner-slot";
import { getCompanies } from "@/lib/queries/public";

export const metadata: Metadata = {
  title: "Poslodavci",
  description: "Lista odobrenih poslodavaca i firmi na imaposla.me."
};

export default async function CompaniesPage() {
  const companies = await getCompanies();
  return (
    <section className="nh-page">
      <div className="nh-page-hero">
        <span>Firme</span>
        <h1>Poslodavci</h1>
        <p>Pregled firmi koje imaju javni profil i aktivno zaposljavaju preko imaposla.me.</p>
      </div>

      <div className="nh-container"><BannerSlot placement="company_pages_top" /></div>

      <div className="nh-container nh-toolbar">
        <div>
          <span className="nh-small-label">Direktorijum firmi</span>
          <h2>{companies.length} poslodavaca</h2>
        </div>
      </div>

      {companies.length ? (
        <div className="nh-container nh-company-grid">
          {companies.map((c) => <CompanyCard company={c} key={c.id} />)}
        </div>
      ) : (
        <div className="nh-container">
          <div className="nh-empty">
            <strong>Nema firmi</strong>
            <p>Firme se prikazuju nakon odobrenja.</p>
          </div>
        </div>
      )}

      <div className="nh-container"><BannerSlot placement="company_pages_bottom" /></div>
    </section>
  );
}
