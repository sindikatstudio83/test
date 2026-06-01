"use client";

import Link from "next/link";
import type { Job } from "@/types/domain";

// Fallback demo data so strip always shows something
const DEMO_JOBS = [
  { id: "d1", title: "Konobar / Šanker", company: "Hotel Avala", city: "Budva", salary: "1000–1200€", urgent: true },
  { id: "d2", title: "Recepcioner", company: "Hotel Splendid", city: "Budva", salary: "900€", urgent: false },
  { id: "d3", title: "Kuhar", company: "Restoran 38", city: "Podgorica", salary: "1200€", urgent: false },
  { id: "d4", title: "Sobarica", company: "Hotel Regent", city: "Tivat", salary: "1100€", urgent: false },
  { id: "d5", title: "Prodavac (m/ž)", company: "VOLI", city: "Podgorica", salary: "900€", urgent: false },
  { id: "d6", title: "Vozač C kategorije", company: "HDL", city: "Podgorica", salary: "1300€", urgent: true },
  { id: "d7", title: "IT asistent", company: "Adriatic Properties", city: "Budva", salary: "1500€", urgent: false },
  { id: "d8", title: "Šef kuhinje", company: "Casa del Mare", city: "Herceg Novi", salary: "1800€", urgent: false },
];

const DEMO_COMPANIES = [
  { id: "c1", name: "Hotel Avala", jobs: 5, initials: "HA" },
  { id: "c2", name: "VOLI", jobs: 12, initials: "VL" },
  { id: "c3", name: "HDL", jobs: 8, initials: "HD" },
  { id: "c4", name: "Iberostar", jobs: 14, initials: "IB" },
  { id: "c5", name: "AMI Hotels", jobs: 9, initials: "AM" },
  { id: "c6", name: "Casa del Mare", jobs: 11, initials: "CM" },
  { id: "c7", name: "Akov", jobs: 18, initials: "AK" },
  { id: "c8", name: "MaxBet", jobs: 7, initials: "MB" },
  { id: "c9", name: "Volcano", jobs: 16, initials: "VO" },
];

interface TickerJob {
  id: string;
  title: string;
  company: string;
  city: string;
  salary?: string;
  urgent?: boolean;
  slug?: string;
}

interface TickerCompany {
  id: string;
  name: string;
  jobs: number;
  initials: string;
  slug?: string;
}

interface TickerStripProps {
  jobs?: TickerJob[];
  companies?: TickerCompany[];
}

// Duplicate array so seamless loop
function doubled<T>(arr: T[]): T[] {
  return [...arr, ...arr];
}

export function TickerStrip({ jobs, companies }: TickerStripProps) {
  const jobItems = (jobs && jobs.length > 0 ? jobs : DEMO_JOBS) as TickerJob[];
  const coItems = (companies && companies.length > 0 ? companies : DEMO_COMPANIES) as TickerCompany[];

  const jobsDup = doubled(jobItems);
  const coDup = doubled(coItems);

  return (
    <div className="ticker-strip">
      {/* Row 1: Job listings */}
      <div className="ticker-row">
        <div className="ticker-label">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <rect x="2" y="3" width="20" height="14" rx="2" />
            <path d="M8 21h8M12 17v4" />
          </svg>
          Oglasi
        </div>
        <div className="ticker-track">
          <div className="ticker-inner" aria-label="Najnoviji oglasi za posao">
            {jobsDup.map((job, i) => (
              <Link
                key={`${job.id}-${i}`}
                href={job.slug ? `/oglasi/${job.slug}` : "/oglasi"}
                className="ticker-job"
                tabIndex={i >= jobItems.length ? -1 : 0}
              >
                {job.urgent && <span className="tj-urgent">Hitno</span>}
                <span className="tj-title">{job.title}</span>
                <span className="tj-co">{job.company}</span>
                {job.salary && <span className="tj-salary">{job.salary}</span>}
                <span className="tj-city">📍 {job.city}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Row 2: Featured companies */}
      <div className="ticker-row">
        <div className="ticker-label">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
            <polyline points="9,22 9,12 15,12 15,22" />
          </svg>
          Firme
        </div>
        <div className="ticker-track">
          <div className="ticker-inner slow" aria-label="Istaknuti poslodavci">
            {coDup.map((co, i) => (
              <Link
                key={`${co.id}-${i}`}
                href={co.slug ? `/firme/${co.slug}` : "/firme"}
                className="ticker-company"
                tabIndex={i >= coItems.length ? -1 : 0}
              >
                <div className="tc-logo">{co.initials}</div>
                <span>{co.name}</span>
                <span className="tc-jobs">{co.jobs} oglasa</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// Server-side version: accepts domain types from DB
export function TickerStripFromDB({
  jobs,
  companies,
}: {
  jobs: Array<{ id: string | number; title: string; slug?: string; salary_text?: string | null; cities?: { name: string } | null; companies?: { name: string; slug?: string } | null; }>;
  companies: Array<{ id: string | number; name: string; slug?: string; job_count?: number }>;
}) {
  const mappedJobs: TickerJob[] = jobs.map(j => ({
    id: String(j.id),
    title: j.title,
    company: j.companies?.name ?? "Poslodavac",
    city: j.cities?.name ?? "Crna Gora",
    salary: j.salary_text ?? undefined,
    slug: j.slug ?? String(j.id),
  }));

  const mappedCos: TickerCompany[] = companies.map(c => ({
    id: String(c.id),
    name: c.name,
    jobs: c.job_count ?? 0,
    initials: c.name.slice(0, 2).toUpperCase(),
    slug: c.slug ?? String(c.id),
  }));

  return <TickerStrip jobs={mappedJobs} companies={mappedCos} />;
}
