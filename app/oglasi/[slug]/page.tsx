import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ApplyForm } from "@/components/apply-form";
import { JobViewTracker } from "@/components/job-view-tracker";
import { BannerSlot } from "@/components/banner-slot";
import { formatDate, initials, jobUrl, parseIdFromSlug } from "@/lib/format";
import { getJobById, getPublicJobs } from "@/lib/queries/public";
import { JobCardClean } from "@/components/job-card-clean";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const id = parseIdFromSlug(slug);
  if (!id) return { title: "Oglas nije pronađen" };
  const job = await getJobById(id);
  if (!job) return { title: "Oglas nije pronađen" };

  const title = `${job.title}${job.companies?.name ? ` — ${job.companies.name}` : ""}`;
  const description = job.description?.slice(0, 160);

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "article",
      images: [
        {
          url: `/og-image?title=${encodeURIComponent(job.title)}&subtitle=${encodeURIComponent(job.companies?.name || "imaposla.me")}`,
          width: 1200,
          height: 630,
          alt: title
        }
      ]
    },
    twitter: {
      card: "summary_large_image",
      title,
      description
    }
  };
}

export default async function JobDetailPage({ params }: Props) {
  const { slug } = await params;
  const id = parseIdFromSlug(slug);
  if (!id) return notFound();
  const [job, allJobs] = await Promise.all([getJobById(id), getPublicJobs({ limit: 10 })]);
  if (!job) return notFound();

  const co = job.companies;
  const similar = allJobs.filter(j => j.id !== job.id && (j.categories?.name === job.categories?.name || j.cities?.name === job.cities?.name)).slice(0, 2);

  return (
    <>
      <div style={{ padding: "16px 0 0" }}>
        <Link className="btn ghost sm" href="/oglasi">← Nazad na oglase</Link>
      </div>
      <section className="detail-layout with-top-space">
        <article className="panel">
          <div className="tags" style={{ marginBottom: 14 }}>
            {job.featured && <span className="badge orange">★ Istaknuto</span>}
            {job.categories?.name && <span className="badge blue">{job.categories.name}</span>}
            {job.contract_type && <span className="tag">{job.contract_type}</span>}
          </div>
          <h1 className="detail-title">{job.title}</h1>

          {/* Key facts grid — never overflows, stacks cleanly on mobile */}
          <div className="detail-facts">
            {co?.name && (
              <div className="detail-fact">
                <span className="detail-fact__label">Poslodavac</span>
                <span className="detail-fact__value">{co.name}</span>
              </div>
            )}
            {job.cities?.name && (
              <div className="detail-fact">
                <span className="detail-fact__label">Lokacija</span>
                <span className="detail-fact__value">{job.cities.name}</span>
              </div>
            )}
            {job.salary_text && (
              <div className="detail-fact">
                <span className="detail-fact__label">Plata</span>
                <span className="detail-fact__value detail-fact__value--salary">{job.salary_text}</span>
              </div>
            )}
            <div className="detail-fact">
              <span className="detail-fact__label">Rok prijave</span>
              <span className="detail-fact__value">{formatDate(job.deadline)}</span>
            </div>
          </div>

          {job.description && <p className="detail-text">{job.description}</p>}

          {similar.length > 0 && (
            <div style={{ marginTop: 32 }}>
              <div className="section-head compact-head"><div><h2 style={{ fontSize: 24 }}>Slični oglasi</h2></div></div>
              <div className="job-list">{similar.map(j => <JobCardClean job={j} key={j.id} />)}</div>
            </div>
          )}
        </article>

        <aside className="sticky">
          <div className="card" style={{ marginBottom: 10 }}>
            <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 14 }}>
              <div className="logo">{initials(co?.name)}</div>
              <div style={{ minWidth: 0 }}>
                <strong style={{ display: "block", fontSize: 16, overflowWrap: "anywhere" }}>{co?.name || "Poslodavac"}</strong>
                <span className="sub">{job.cities?.name || "Crna Gora"}</span>
              </div>
            </div>
            <div className="tags" style={{ marginBottom: 14 }}>
              {job.salary_text && <span className="badge lime">{job.salary_text}</span>}
              <span className="tag">Rok {formatDate(job.deadline)}</span>
              {job.contract_type && <span className="tag">{job.contract_type}</span>}
            </div>
            {co && <Link className="btn ghost sm" href={`/firme/${co.slug || co.id}`} style={{ width: "100%", justifyContent: "center", marginBottom: 8 }}>Profil firme</Link>}
          </div>
          <div className="card">
            <h2 style={{ fontSize: 22, marginBottom: 14 }}>Prijavi se</h2>
            <JobViewTracker jobId={job.id} />
            <BannerSlot placement="job_detail_top" />
            <ApplyForm jobId={job.id} />
          </div>
        </aside>
        <BannerSlot placement="job_detail_bottom" />
      </section>
    </>
  );
}
