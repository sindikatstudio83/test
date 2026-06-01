"use client";

import { useRouter } from "next/navigation";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { getSavedJobs, unsaveJob } from "@/lib/queries/account";
import { jobUrl, formatDate } from "@/lib/format";
import { Avatar } from "@/components/avatar";
import type { SavedJob } from "@/types/domain";

export function SavedJobsClient() {
  const router = useRouter();
  const { role, userId, ready } = useAuth();
  const [items, setItems] = useState<SavedJob[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ready) return;
    if (!userId || role === "guest") {
      router.replace("/login?next=/profil/sacuvani");
      return;
    }
    if (role !== "candidate" && role !== "admin") {
      router.replace("/profil");
      return;
    }
    getSavedJobs(userId).then(data => { setItems(data); setLoading(false); });
  }, [ready, role, userId, router]);

  async function remove(jobId: number) {
    if (!userId) return;
    const ok = await unsaveJob(userId, jobId);
    if (ok) setItems(items.filter(s => s.job_id !== jobId));
  }

  if (!ready || loading) return <div className="panel"><p>Učitavanje...</p></div>;

  return (
    <section>
      <div className="section-head">
        <div>
          <span className="page-label">Kandidat</span>
          <h1>Sačuvani oglasi</h1>
          <p className="sub">{items.length} {items.length === 1 ? "sačuvan oglas" : "sačuvanih oglasa"}</p>
        </div>
        <Link className="btn blue" href="/oglasi">Pretraži oglase →</Link>
      </div>

      {items.length === 0 ? (
        <div className="empty">
          <strong>Još nema sačuvanih oglasa</strong>
          <p>Otvori oglas i klikni „Sačuvaj“ da ga sačuvaš za kasnije.</p>
          <div className="actions">
            <Link className="btn blue sm" href="/oglasi">Otvori oglase →</Link>
          </div>
        </div>
      ) : (
        <div className="grid two">
          {items.map(s => {
            const job = s.jobs;
            if (!job) return null;
            return (
              <article className="job-card" key={s.id} style={{ gridTemplateColumns: "auto 1fr" }}>
                <div className="logo">
                  <Avatar bucket="company-logos" path={job.companies?.logo_path} fallback={job.companies?.name || ""} size={56} shape="rounded" />
                </div>
                <div>
                  <Link className="job-title" href={jobUrl(job)}>{job.title}</Link>
                  <div className="meta" style={{ marginTop: 4 }}>
                    {job.companies?.name && <span>{job.companies.name}</span>}
                    {job.cities?.name && <span>· {job.cities.name}</span>}
                  </div>
                  <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <Link className="btn blue sm" href={jobUrl(job)}>Detalji</Link>
                    <button className="btn ghost sm" onClick={() => remove(job.id)} type="button">Ukloni</button>
                  </div>
                  {job.deadline && (
                    <p className="hint" style={{ marginTop: 8 }}>Rok: {formatDate(job.deadline)}</p>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
