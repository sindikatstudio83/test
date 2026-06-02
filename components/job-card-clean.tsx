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
    <article className="jlist-item nx-job-card">
      <Link className="jlist-thumb nx-job-thumb" href={url} aria-label={job.title}>
        <Avatar
          bucket="company-logos"
          path={co?.logo_path ?? null}
          fallback={co?.name ?? ""}
          size={64}
          shape="rounded"
        />
      </Link>

      <div className="jlist-body">
        <div className="jlist-top">
          <div>
            <Link className="jlist-title" href={url}>{job.title}</Link>
            <div className="jlist-exp">{co?.name || "Poslodavac"}</div>
          </div>
          <span className="jlist-ago">Rok {formatDate(job.deadline)}</span>
        </div>
        <div className="jlist-meta">
          {job.cities?.name && <span>Lokacija: {job.cities.name}</span>}
          {job.salary_text && <span>Plata: {job.salary_text}</span>}
          {job.categories?.name && <span>{job.categories.name}</span>}
        </div>
        <div className="jcard-tags">
          {job.featured && <span className="jtag jtag-red">Istaknuto</span>}
          {job.contract_type && <span className="jtag jtag-green">{job.contract_type}</span>}
          {meta.filter((m) => m !== job.contract_type).slice(0, 2).map((m, i) => <span className="jtag jtag-gray" key={i}>{m}</span>)}
        </div>
        {descTruncated && (
          <p className="jlist-desc">{descTruncated}</p>
        )}
      </div>

      <div className="jlist-right">
        <Link className="btn-details" href={url}>Detalji</Link>
        <SaveJobButton jobId={job.id} size="sm" />
      </div>
    </article>
  );
}
