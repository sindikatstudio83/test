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
    <section className="nx-page">
      <div className="page-banner">
        <div className="pb-wrap">
          <h1 className="pb-title">Top Firme</h1>
          <div className="crumb"><span>Početna</span><span>/</span><span>Firme</span></div>
        </div>
      </div>

      <div className="nh-container"><BannerSlot placement="company_pages_top" /></div>

      <div className="nx-container nh-toolbar">
        <div className="sec-head sec-head-dark" style={{ marginBottom: 24 }}>
          <h2>{companies.length} <span>poslodavaca</span></h2>
          <p>Direktorijum firmi koje imaju javni profil i aktivno zapošljavaju.</p>
        </div>
      </div>

      {companies.length ? (
        <div className="nx-container comp-grid" style={{ paddingBottom: 40 }}>
          {companies.map((c) => <CompanyCard company={c} key={c.id} />)}
        </div>
      ) : (
        <div className="nx-container">
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
