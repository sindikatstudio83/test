"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { createBrowserSupabase } from "@/lib/supabase/client";
import { safeMessage, logError } from "@/lib/errors";

type ApplyState = "loading" | "guest" | "wrong-role" | "duplicate" | "no-cv" | "ready" | "submitting" | "done" | "error";

const COVER_LETTER_MAX = 1200;

export function ApplyForm({ jobId }: { jobId: number }) {
  const { role, userId, ready } = useAuth();
  const router = useRouter();
  const [state, setState] = useState<ApplyState>("loading");
  const [message, setMessage] = useState("");
  const [coverLetter, setCoverLetter] = useState("");
  const [returnPath, setReturnPath] = useState("/oglasi");

  useEffect(() => {
    setReturnPath(`${window.location.pathname}${window.location.search}`);
    if (!ready) return;

    if (!userId || role === "guest") {
      setState("guest");
      return;
    }

    if (role !== "candidate") {
      setState("wrong-role");
      return;
    }

    const supabase = createBrowserSupabase();

    async function check() {
      // Paralelne provjere
      const [existingResult, profileResult] = await Promise.all([
        supabase
          .from("job_applications")
          .select("id")
          .eq("job_id", jobId)
          .eq("candidate_id", userId!)
          .maybeSingle(),
        supabase
          .from("profiles")
          .select("full_name,phone,city,cv_data")
          .eq("id", userId!)
          .maybeSingle()
      ]);

      if (existingResult.data?.id) {
        setState("duplicate");
        return;
      }

      const profileData = profileResult.data;
      const cv = profileData?.cv_data || {};
      const hasCv = Boolean(
        (cv as { summary?: string; experience?: string; skills?: string }).summary ||
        (cv as { experience?: string }).experience ||
        (cv as { skills?: string }).skills ||
        profileData?.full_name ||
        profileData?.phone ||
        profileData?.city
      );

      if (!hasCv) {
        setState("no-cv");
        return;
      }

      setState("ready");
    }
    check();
  }, [ready, role, userId, jobId]);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!userId) return;

    const trimmed = coverLetter.trim();
    if (!trimmed) {
      setMessage("Upiši kratak propratni tekst.");
      setState("error");
      return;
    }

    setState("submitting");
    setMessage("");

    const supabase = createBrowserSupabase();
    const { data: insertData, error } = await supabase
      .from("job_applications")
      .insert({
        job_id: jobId,
        candidate_id: userId,
        cover_letter: trimmed,
        cv_path: null,
        reference_code: `IP-${crypto.randomUUID().split("-")[0].toUpperCase()}`
      })
      .select("id")
      .single();

    if (error) {
      logError("ApplyForm.submit", error);
      setMessage(safeMessage(error, "submit"));
      setState("error");
      return;
    }

    // Best-effort: insert notification for candidate (allowed by RLS)
    // Company notification is handled by DB trigger (see supabase-banners-notifications-fix.sql)
    if (insertData?.id) {
      supabase.from("notifications").insert({
        recipient_id: userId,
        title: "Prijava poslata",
        message: "Tvoja prijava je uspješno primljena. Prati status u Mojim prijavama.",
        notification_type: "application_sent",
        link: "/profil/prijave"
      }).then(() => {}); // fire and forget
    }

    setState("done");
  }

  if (!ready || state === "loading") return <p className="notice">Provjeravamo nalog...</p>;

  if (state === "guest") return (
    <div className="empty">
      <strong>Prijava zahtijeva nalog</strong>
      <p>Prijavi se kao kandidat ili napravi nalog za 30 sekundi.</p>
      <div className="actions">
        <Link className="btn blue sm" href={`/login?next=${encodeURIComponent(returnPath)}`}>Prijava</Link>
        <Link className="btn ghost sm" href={`/registracija?role=candidate&intent=job_seeker&next=${encodeURIComponent(returnPath)}`}>Registracija</Link>
      </div>
    </div>
  );

  if (state === "wrong-role") return null;

  if (state === "duplicate") return (
    <p className="notice success">
      ✓ Već si poslao/la prijavu za ovaj oglas.{" "}
      <Link href="/profil/prijave" style={{ fontWeight: 900 }}>Prati status →</Link>
    </p>
  );

  if (state === "no-cv") return (
    <div className="empty">
      <strong>Biografija nije popunjena</strong>
      <p>Dopuni osnovne podatke u biografiji, pa se vrati i pošalji prijavu.</p>
      <div className="actions">
        <Link className="btn blue sm" href="/profil/biografija">Dopuni biografiju →</Link>
      </div>
    </div>
  );

  if (state === "done") return (
    <div className="empty">
      <strong>✓ Prijava je poslata!</strong>
      <p>Možeš pratiti status u sekciji Moje prijave.</p>
      <div className="actions">
        <button className="btn blue sm" onClick={() => router.push("/profil/prijave")}>
          Moje prijave →
        </button>
      </div>
    </div>
  );

  return (
    <form onSubmit={submit} className="apply-form">
      <label>
        <span className="label">Propratni tekst *</span>
        <textarea
          className="textarea"
          name="cover_letter"
          maxLength={COVER_LETTER_MAX}
          placeholder="Predstavi se u par rečenica — ko si, šta znaš i zašto si dobar/a izbor."
          value={coverLetter}
          onChange={(e) => setCoverLetter(e.target.value)}
          required
          style={{ minHeight: 130 }}
        />
        <div className="counter">{coverLetter.length}/{COVER_LETTER_MAX}</div>
      </label>
      <p className="notice">📋 Prijava koristi biografiju iz tvog profila — fajlovi se ne šalju.</p>
      {state === "error" && message && <p className="notice error" role="alert">{message}</p>}
      <button className="btn blue" type="submit" disabled={state === "submitting"} style={{ width: "100%" }}>
        {state === "submitting" ? "Slanje..." : "Pošalji prijavu →"}
      </button>
    </form>
  );
}
