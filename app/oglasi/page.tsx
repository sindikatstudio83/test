import type { Metadata } from "next";
import Link from "next/link";
import React from "react";
import { Avatar } from "@/components/avatar";
import { BannerSlot } from "@/components/banner-slot";
import { GuestJobsCta } from "@/components/guest-jobs-cta";
import { getLookups, getPublicJobs } from "@/lib/queries/public";
import { jobUrl, formatDate } from "@/lib/format";
import type { Job, LookupItem } from "@/types/domain";

export const metadata: Metadata = {
  title: "Oglasi za posao — imaposla.me",
  description: "Pretraži oglase za posao u Crnoj Gori. Filtriraj po gradu, kategoriji i poslodavcu.",
};

// Days until deadline
function daysLeft(deadline: string | null): string | null {
  if (!deadline) return null;
  const diff = Math.ceil((new Date(deadline).getTime() - Date.now()) / 86400000);
  if (diff < 0) return "Istekao";
  if (diff === 0) return "Ističe danas";
  if (diff === 1) return "Ističe sutra";
  return `Ističe za ${diff} dana`;
}

export default async function JobsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; city?: string; category?: string; employer?: string }>;
}) {
  const params = await searchParams;

  const [jobs, lookups] = await Promise.all([
    getPublicJobs({
      q: params.q || undefined,
      city: params.city || undefined,
      category: params.category || undefined,
      limit: 200,
    }),
    getLookups(),
  ]);

  const isFiltering = Boolean(params.q || params.city || params.category);

  // Count per city/category for sidebar
  const cityCounts = jobs.reduce<Record<string, number>>((acc, j) => {
    const name = j.cities?.name;
    if (name) acc[name] = (acc[name] || 0) + 1;
    return acc;
  }, {});
  const catCounts = jobs.reduce<Record<string, number>>((acc, j) => {
    const name = j.categories?.name;
    if (name) acc[name] = (acc[name] || 0) + 1;
    return acc;
  }, {});

  const totalLabel = `${jobs.length} oglasa`;

  // Build reset/filter URLs
  function filterUrl(key: string, val: string) {
    const p = new URLSearchParams();
    if (params.q) p.set("q", params.q);
    if (params.city) p.set("city", params.city);
    if (params.category) p.set("category", params.category);
    p.set(key, val);
    return `/oglasi?${p.toString()}`;
  }
  function removeFilter(key: string) {
    const p = new URLSearchParams();
    if (params.q && key !== "q") p.set("q", params.q);
    if (params.city && key !== "city") p.set("city", params.city);
    if (params.category && key !== "category") p.set("category", params.category);
    const s = p.toString();
    return s ? `/oglasi?${s}` : "/oglasi";
  }

  return (
    <>
      {/* ── PAGE HEADER ── */}
      <div className="jl-header">
        <h1 className="jl-title">Oglasi za posao</h1>
      </div>

      <GuestJobsCta />

      <BannerSlot placement="jobs_list_top" />

      <div className="jl-layout">

        {/* ══════════════ SIDEBAR ══════════════ */}
        <aside className="jl-sidebar">

          {/* Mobile: search form (shown above list on mobile) */}
          <form className="jl-mobile-search" method="get" action="/oglasi">
            <div className="jl-field-wrap">
              <span className="jl-field-icon">🔍</span>
              <input
                className="jl-field"
                name="q"
                placeholder="keyword"
                defaultValue={params.q || ""}
                aria-label="Pretraži"
              />
            </div>
            <select className="jl-select" name="city" defaultValue={params.city || ""} aria-label="Grad">
              <option value="">Svi gradovi</option>
              {lookups.cities.map((c: LookupItem) => (
                <option key={c.id} value={c.name}>{c.name}</option>
              ))}
            </select>
            <select className="jl-select" name="category" defaultValue={params.category || ""} aria-label="Kategorija">
              <option value="">Sve kategorije</option>
              {lookups.categories.map((c: LookupItem) => (
                <option key={c.id} value={c.name}>{c.name}</option>
              ))}
            </select>
            <button type="submit" className="jl-search-btn">Pretraži</button>
          </form>

          {/* Desktop sidebar filter panel */}
          <div className="jl-filter-panel">
            <div className="jl-filter-title">Filter</div>

            {/* Search */}
            <form method="get" action="/oglasi" className="jl-sidebar-search">
              <div className="jl-field-wrap">
                <span className="jl-field-icon">🔍</span>
                <input
                  className="jl-field"
                  name="q"
                  placeholder="keyword"
                  defaultValue={params.q || ""}
                />
              </div>
              {params.city && <input type="hidden" name="city" value={params.city} />}
              {params.category && <input type="hidden" name="category" value={params.category} />}
              <button type="submit" className="jl-search-btn">Pretraži</button>
            </form>

            {/* By City */}
            <div className="jl-filter-group">
              <div className="jl-filter-group-label">Po gradu</div>
              {lookups.cities
                .filter((c: LookupItem) => (cityCounts[c.name] || 0) > 0)
                .sort((a: LookupItem, b: LookupItem) => (cityCounts[b.name] || 0) - (cityCounts[a.name] || 0))
                .map((c: LookupItem) => (
                  <label key={c.id} className="jl-filter-item">
                    <Link
                      href={params.city === c.name ? removeFilter("city") : filterUrl("city", c.name)}
                      className={`jl-filter-link${params.city === c.name ? " active" : ""}`}
                    >
                      <span className="jl-filter-check">{params.city === c.name ? "✓" : ""}</span>
                      <span className="jl-filter-name">{c.name}</span>
                      <span className="jl-filter-count">({cityCounts[c.name] || 0})</span>
                    </Link>
                  </label>
                ))}
            </div>

            {/* By Category */}
            <div className="jl-filter-group">
              <div className="jl-filter-group-label">Po kategoriji</div>
              {lookups.categories
                .filter((c: LookupItem) => (catCounts[c.name] || 0) > 0)
                .sort((a: LookupItem, b: LookupItem) => (catCounts[b.name] || 0) - (catCounts[a.name] || 0))
                .map((c: LookupItem) => (
                  <label key={c.id} className="jl-filter-item">
                    <Link
                      href={params.category === c.name ? removeFilter("category") : filterUrl("category", c.name)}
                      className={`jl-filter-link${params.category === c.name ? " active" : ""}`}
                    >
                      <span className="jl-filter-check">{params.category === c.name ? "✓" : ""}</span>
                      <span className="jl-filter-name">{c.name}</span>
                      <span className="jl-filter-count">({catCounts[c.name] || 0})</span>
                    </Link>
                  </label>
                ))}
            </div>
          </div>
        </aside>

        {/* ══════════════ MAIN LISTA ══════════════ */}
        <main className="jl-main">

          {/* Count + reset */}
          <div className="jl-main-head">
            <span className="jl-count">{jobs.length} {jobs.length === 1 ? "oglas" : "oglasa"}</span>
            {isFiltering && (
              <Link href="/oglasi" className="jl-reset">
                ↺ Poništi pretragu
              </Link>
            )}
          </div>

          {/* Active filter tags */}
          {isFiltering && (
            <div className="jl-active-filters">
              {params.q && (
                <Link href={removeFilter("q")} className="jl-active-tag">
                  {`„${params.q}" ×`}
                </Link>
              )}
              {params.city && (
                <Link href={removeFilter("city")} className="jl-active-tag">
                  {params.city} ×
                </Link>
              )}
              {params.category && (
                <Link href={removeFilter("category")} className="jl-active-tag">
                  {params.category} ×
                </Link>
              )}
            </div>
          )}

          {/* Job list */}
          {jobs.length === 0 ? (
            <div className="jl-empty">
              <strong>Nema oglasa za zadatu pretragu.</strong>
              <p>Pokušaj s drugim ključnim riječima ili poništi filtere.</p>
              <Link href="/oglasi" className="btn red sm" style={{ marginTop: 12 }}>Poništi pretragu</Link>
            </div>
          ) : (
            <div className="jl-list">
              {jobs.map((job: Job, idx: number) => (
                <React.Fragment key={job.id}>
                  <JobRow job={job} />
                  {(idx + 1) % 15 === 0 && idx < jobs.length - 1 && (
                    <div className="jl-banner-slot">
                      <BannerSlot placement="jobs_list_middle" />
                    </div>
                  )}
                </React.Fragment>
              ))}
            </div>
          )}

        </main>
      </div>

      <BannerSlot placement="jobs_list_bottom" />
    </>
  );
}

/* ── JOB ROW — zaposli.me stil ── */
function JobRow({ job }: { job: Job }) {
  const co = job.companies;
  const url = jobUrl(job);
  const expires = daysLeft(job.deadline);
  const isFeatured = job.featured;
  const isExpiringSoon = expires?.includes("danas") || expires?.includes("sutra") || expires?.includes("3 dana") || expires?.includes("2 dana");

  return (
    <Link
      href={url}
      className={`jl-row${isFeatured ? " jl-row--featured" : ""}`}
    >
      {/* Logo */}
      <div className="jl-row-logo">
        <Avatar
          bucket="company-logos"
          path={co?.logo_path ?? null}
          fallback={co?.name ?? ""}
          size={56}
          shape="rounded"
        />
      </div>

      {/* Info */}
      <div className="jl-row-body">
        <div className="jl-row-title">{job.title}</div>
        <div className="jl-row-company">{co?.name || "Poslodavac"}</div>
        <div className="jl-row-meta">
          {job.deadline && (
            <span className="jl-row-meta-item jl-row-date">
              <span className="jl-meta-icon" aria-hidden>🕐</span>
              {formatDate(job.deadline)}
            </span>
          )}
          {job.cities?.name && (
            <span className="jl-row-meta-item jl-row-city">
              <span className="jl-meta-icon" aria-hidden>📍</span>
              {job.cities.name}
            </span>
          )}
          {expires && (
            <span className={`jl-row-meta-item jl-row-expires${isExpiringSoon ? " jl-row-expires--soon" : ""}`}>
              <span className="jl-meta-icon" aria-hidden>⏳</span>
              {expires}
            </span>
          )}
          {job.salary_text && (
            <span className="jl-row-meta-item jl-row-salary">
              {job.salary_text}
            </span>
          )}
        </div>
      </div>

      {/* Right: badges */}
      <div className="jl-row-right">
        {isFeatured && <span className="jl-badge-featured">★ Istaknuto</span>}
        {job.contract_type && (
          <span className="jl-badge-contract">{job.contract_type}</span>
        )}
      </div>
    </Link>
  );
}
