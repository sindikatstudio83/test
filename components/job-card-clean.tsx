import Link from "next/link";
import { formatDate, jobUrl } from "@/lib/format";
import { Avatar } from "@/components/avatar";
import { SaveJobButton } from "@/components/save-job-button";
import type { Job, JobWithPromotion } from "@/types/domain";

type CardJob = Job | JobWithPromotion;

const DESCRIPTION_MAX = 160;

export function JobCardClean({ job }: { job: CardJob }) {
  const co = job.companies;
  const url = jobUrl(job);

  const meta = [
    job.cities?.name,
    job.categories?.name,
    job.contract_type,
    job.salary_text,
  ].filter(Boolean);

  const desc = job.description ?? "";
  const descTruncated = desc.length > DESCRIPTION_MAX
    ? desc.slice(0, DESCRIPTION_MAX) + "…"
    : desc;

  return (
    <article className="job-card job-card-clean">
      <div className="job-card-clean__logo">
        <Avatar
          bucket="company-logos"
          path={co?.logo_path ?? null}
          fallback={co?.name ?? ""}
          size={52}
          shape="rounded"
        />
      </div>

      <div className="job-card-clean__main">
        <div className="job-card-clean__top">
          <span className="job-card-clean__company">{co?.name || "Poslodavac"}</span>
        </div>
        <Link className="job-title" href={url}>{job.title}</Link>
        <div className="job-card-clean__meta">
          {meta.map((m, i) => <span key={i}>{m}</span>)}
        </div>
        {descTruncated && (
          <p className="job-desc">{descTruncated}</p>
        )}
      </div>

      <div className="job-actions job-card-clean__actions">
        <div className="deadline">
          Rok prijave <strong>{formatDate(job.deadline)}</strong>
        </div>
        <Link className="btn blue sm" href={url}>Detalji i prijava</Link>
        <SaveJobButton jobId={job.id} size="sm" />
      </div>
    </article>
  );
}
