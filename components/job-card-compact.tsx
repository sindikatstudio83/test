import Link from "next/link";
import { Avatar } from "@/components/avatar";
import { jobUrl } from "@/lib/format";
import type { JobWithPromotion } from "@/types/domain";

interface Props {
  job: JobWithPromotion;
}

const PROMO_LABELS: Record<string, { label: string; cls: string }> = {
  paid_top:     { label: "★ Top",  cls: "badge red"   },
  featured:     { label: "★",      cls: "badge red"   },
  urgent:       { label: "Hitno",  cls: "badge red"   },
  homepage_top: { label: "HP",     cls: "badge blue"  },
};

export function JobCardCompact({ job }: Props) {
  const co = job.companies;
  const url = jobUrl(job);
  const promo = job.promotion_type ? PROMO_LABELS[job.promotion_type] : null;
  const jobExt = job as JobWithPromotion & {
    quick_job?: boolean;
    daily_rate?: number | null;
    cities?: { name: string } | null;
  };

  return (
    <Link
      href={url}
      className={`job-compact${promo ? " job-compact--promo" : ""}${jobExt.quick_job ? " job-compact--quick" : ""}`}
    >
      {/* Logo — 48px */}
      <div className="job-compact__logo">
        <Avatar bucket="company-logos" path={co?.logo_path ?? null} fallback={co?.name ?? ""} size={44} shape="rounded" />
      </div>

      {/* Info */}
      <div className="job-compact__body">
        <span className="job-compact__title">{job.title}</span>
        {co?.name && <span className="job-compact__company">{co.name}</span>}
        {jobExt.cities?.name && (
          <span className="job-compact__city">📍 {jobExt.cities.name}</span>
        )}
        {job.salary_text && (
          <span style={{ fontSize: 11, fontWeight: 700, color: "var(--green)", marginTop: 1 }}>
            {job.salary_text}
          </span>
        )}
        {jobExt.quick_job && jobExt.daily_rate && (
          <span className="job-compact__rate">⚡ {jobExt.daily_rate} € / dan</span>
        )}
      </div>

      {/* Badge */}
      {(promo || jobExt.quick_job) && (
        <div className="job-compact__badge">
          {promo
            ? <span className={promo.cls}>{promo.label}</span>
            : <span className="badge green">Brzo</span>
          }
        </div>
      )}
    </Link>
  );
}
