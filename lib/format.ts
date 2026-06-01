export function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "") || "stavka";
}

export function jobUrl(job: { id: number; title: string }) {
  return `/oglasi/${slugify(job.title)}-${job.id}`;
}

export function companyUrl(company: { id: number; name: string }) {
  return `/firme/${slugify(company.name)}-${company.id}`;
}

export function parseIdFromSlug(slug: string) {
  const match = slug.match(/-(\d+)$/);
  return match ? Number(match[1]) : null;
}

export function formatDate(value?: string | null, options?: { withTime?: boolean }) {
  if (!value) return "Bez roka";
  try {
    const opts: Intl.DateTimeFormatOptions = { dateStyle: "medium" };
    if (options?.withTime) opts.timeStyle = "short";
    return new Intl.DateTimeFormat("sr-ME", opts).format(new Date(value));
  } catch {
    return value;
  }
}

export function money(value?: number | string | null) {
  if (!value) return "Po dogovoru";
  return `${Number(value).toFixed(0)} EUR`;
}

export function initials(value?: string | null) {
  return (value || "IP")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}
