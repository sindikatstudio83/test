// ════════════════════════════════════════════════════════════════════════════
// Supabase Edge Function: weekly-digest
// ════════════════════════════════════════════════════════════════════════════
// Sends a weekly email to candidates with active jobs + quick gigs matching
// their interests (candidate_interests). Idempotent per ISO week via
// weekly_digest_log.
//
// DEPLOY:
//   supabase functions deploy weekly-digest --no-verify-jwt
//
// SCHEDULE (Supabase Dashboard → Edge Functions → Cron, or pg_cron):
//   0 9 * * 1   (every Monday 09:00)
//
// REQUIRED ENV (supabase secrets set ...):
//   SUPABASE_URL              — project URL
//   SUPABASE_SERVICE_ROLE_KEY — service role key (server-side only!)
//   RESEND_API_KEY            — Resend API key (or adapt for SendGrid)
//   DIGEST_FROM_EMAIL         — e.g. "imaposla.me <noreply@imaposla.me>"
//   SITE_URL                  — e.g. "https://imaposla.me"
//
// NOTE: This is a working skeleton. The email send uses Resend's REST API.
// If you use SendGrid instead, swap the sendEmail() implementation.
// ════════════════════════════════════════════════════════════════════════════

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const FROM_EMAIL = Deno.env.get("DIGEST_FROM_EMAIL") ?? "imaposla.me <noreply@imaposla.me>";
const SITE_URL = Deno.env.get("SITE_URL") ?? "https://imaposla.me";

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false },
});

// ISO week key for idempotency (e.g. "2026-W22")
function isoWeekKey(d = new Date()): string {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = (date.getUTCDay() + 6) % 7;
  date.setUTCDate(date.getUTCDate() - dayNum + 3);
  const firstThursday = new Date(Date.UTC(date.getUTCFullYear(), 0, 4));
  const week = 1 + Math.round(
    ((date.getTime() - firstThursday.getTime()) / 86400000 - 3 + ((firstThursday.getUTCDay() + 6) % 7)) / 7
  );
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  if (!RESEND_API_KEY) {
    console.log(`[DRY RUN] would send to ${to}: ${subject}`);
    return true; // dry-run when no API key configured
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from: FROM_EMAIL, to, subject, html }),
  });
  if (!res.ok) {
    console.error("Resend error", await res.text());
    return false;
  }
  return true;
}

function buildEmailHtml(name: string, jobs: any[], gigs: any[]): string {
  const jobItems = jobs.map(j =>
    `<li><a href="${SITE_URL}/oglasi/${j.id}">${j.title}</a> — ${j.cities?.name ?? ""}</li>`
  ).join("");
  const gigItems = gigs.map(g =>
    `<li><a href="${SITE_URL}/brzi-poslovi/angazmani/${g.id}">${g.title}</a> — ${g.city}${g.pay_text ? ` · ${g.pay_text}` : ""}</li>`
  ).join("");

  return `
    <div style="font-family:sans-serif;max-width:560px;margin:0 auto">
      <h2>Poslovi za tvoja interesovanja</h2>
      <p>Zdravo ${name || ""}, evo aktivnih poslova koji ti odgovaraju:</p>
      ${jobs.length ? `<h3>Oglasi</h3><ul>${jobItems}</ul>` : ""}
      ${gigs.length ? `<h3>Brzi angažmani</h3><ul>${gigItems}</ul>` : ""}
      <p style="margin-top:24px">
        <a href="${SITE_URL}/brzi-poslovi" style="background:#e5333a;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none">Pogledaj sve</a>
      </p>
      <hr style="margin:24px 0;border:none;border-top:1px solid #eee" />
      <p style="font-size:12px;color:#888">
        <a href="${SITE_URL}/profil/interesovanja">Izmijeni interesovanja</a> ·
        <a href="${SITE_URL}/profil/interesovanja">Odjavi se</a>
      </p>
    </div>
  `;
}

Deno.serve(async () => {
  const weekKey = isoWeekKey();
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - 7);

  // 1. Get all candidates with email enabled
  const { data: interests, error } = await supabase
    .from("candidate_interests")
    .select("user_id, professions, cities, categories, job_types, min_daily_pay, email_enabled")
    .eq("email_enabled", true);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  let sent = 0, skipped = 0, failed = 0;

  for (const it of interests ?? []) {
    // Idempotency: skip if already sent this ISO week
    const { data: alreadySent } = await supabase
      .from("weekly_digest_log")
      .select("id")
      .eq("user_id", it.user_id)
      .gte("sent_at", weekStart.toISOString())
      .maybeSingle();
    if (alreadySent) { skipped++; continue; }

    // Get candidate email + name
    const { data: profile } = await supabase
      .from("profiles")
      .select("email, full_name")
      .eq("id", it.user_id)
      .maybeSingle();
    if (!profile?.email) { skipped++; continue; }

    // 2. Find matching active jobs (by category) + active gigs (by profession/city)
    let jobsQuery = supabase
      .from("jobs")
      .select("id,title,cities(name),category_id")
      .eq("status", "active")
      .limit(10);
    if (it.categories?.length) jobsQuery = jobsQuery.in("category_id", it.categories);
    const { data: jobs } = await jobsQuery;

    let gigsQuery = supabase
      .from("quick_gigs")
      .select("id,title,city,pay_text,profession_id")
      .eq("status", "active")
      .limit(10);
    if (it.professions?.length) gigsQuery = gigsQuery.in("profession_id", it.professions);
    const { data: gigs } = await gigsQuery;

    const jobList = jobs ?? [];
    const gigList = gigs ?? [];

    // Skip if nothing to send
    if (jobList.length === 0 && gigList.length === 0) { skipped++; continue; }

    // 3. Send email
    const html = buildEmailHtml(profile.full_name ?? "", jobList, gigList);
    const ok = await sendEmail(profile.email, "Poslovi koji odgovaraju tvojim interesovanjima", html);

    if (ok) {
      await supabase.from("weekly_digest_log").insert({
        user_id: it.user_id,
        job_count: jobList.length,
        gig_count: gigList.length,
      });
      sent++;
    } else {
      failed++;
    }
  }

  return new Response(JSON.stringify({ weekKey, sent, skipped, failed }), {
    headers: { "Content-Type": "application/json" },
  });
});
