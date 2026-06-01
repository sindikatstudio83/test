import Link from "next/link";
import { formatDate, jobUrl } from "@/lib/format";
import { Avatar } from "@/components/avatar";
import { SaveJobButton } from "@/components/save-job-button";
import type { Job } from "@/types/domain";

export function JobCard({ job, showStatus = false }: { job: Job; showStatus?: boolean }) {
  const co = job.companies;
  const url = jobUrl(job);
  return (
    <article className={`job-card${job.featured ? " featured featured-card" : ""}`}>
      {job.featured && <span className="featured-badge">★ Istaknuto</span>}

      {/* Logo — 60px, stable */}
      <div className="logo">
        <Avatar bucket="company-logos" path={co?.logo_path} fallback={co?.name || ""} size={56} shape="rounded" />
      </div>

      {/* Body */}
      <div>
        <div className="tags" style={{ marginBottom: 6 }}>
          {job.categories?.name && <span className="badge blue">{job.categories.name}</span>}
          {job.contract_type && <span className="tag">{job.contract_type}</span>}
          {showStatus && (
            <span className={`badge ${job.status === "active" ? "green" : job.status === "pending_review" ? "orange" : "gray"}`}>
              {job.status === "active" ? "Aktivan" : job.status === "pending_review" ? "Na pregledu" : job.status}
            </span>
          )}
        </div>
        <Link className="job-title" href={url}>{job.title}</Link>
        <div className="meta" style={{ marginBottom: 5 }}>
          {co?.name && <span style={{ fontWeight: 600 }}>{co.name}</span>}
          {job.cities?.name && <span>· {job.cities.name}</span>}
          {job.salary_text && <span>· {job.salary_text}</span>}
        </div>
        {job.description && (
          <p className="job-desc">{job.description.slice(0, 200)}{job.description.length > 200 ? "..." : ""}</p>
        )}
      </div>

      {/* Actions row */}
      <div className="job-actions">
        <div className="deadline">
          Rok prijave<br />
          <strong style={{ color: "var(--ink)", fontSize: 13 }}>{formatDate(job.deadline)}</strong>
        </div>
        {job.salary_text && (
          <span className="badge green" style={{ marginLeft: "auto" }}>{job.salary_text}</span>
        )}
        <Link className="btn blue sm" href={url}>Prijavi se</Link>
        <Link className="btn ghost sm" href={url}>Detalji</Link>
        <SaveJobButton jobId={job.id} size="sm" />
      </div>
    </article>
  );
}
