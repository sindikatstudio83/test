"use client";

import Link from "next/link";
import { useState } from "react";
import { createBrowserSupabase } from "@/lib/supabase/client";
import { safeMessage, logError } from "@/lib/errors";
import { getStoredIntent, setStoredIntent, clearStoredIntent, setLoginRedirecting, clearLoginRedirecting } from "@/lib/auth-intent";

export function LoginForm({ nextPath }: { nextPath?: string | null }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const fd = new FormData(e.currentTarget);
    const email = String(fd.get("email") || "").trim();
    const password = String(fd.get("password") || "");

    if (!email || !password) {
      setError("Upiši e-poštu i lozinku.");
      setLoading(false);
      return;
    }

    // Mark the redirect before Supabase updates the session, so RedirectIfAuthed
    // does not race us and send the user to a generic dashboard.
    setLoginRedirecting();

    const supabase = createBrowserSupabase();
    const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password });

    if (authError || !data.session) {
      clearLoginRedirecting();
      logError("auth.signIn", authError);
      setError(safeMessage(authError, "auth"));
      setLoading(false);
      return;
    }

    // UVIJEK provjeravamo DB role — ne oslanjamo se na user_metadata
    // (metadata može biti zastarjela ili ne-postavljena za starije korisnike)
    let dest = "/profil";
    const safeNext = nextPath && nextPath.startsWith("/") && !nextPath.startsWith("//") ? nextPath : null;

    if (safeNext) {
      dest = safeNext;
    } else {
      try {
        const { data: prof } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", data.user.id)
          .maybeSingle();

        const intent = getStoredIntent();
        if (prof?.role === "company") dest = "/firma";
        else if (prof?.role === "admin") dest = "/admin";
        else if (intent === "worker") dest = "/profil/brzi-profil";
        else if (intent === "job_seeker") dest = "/profil/biografija";
        else dest = "/profil"; // candidate bez intent-a ili fallback
      } catch {
        // DB unavailable — fall back to metadata for UX redirect ONLY.
        // NOTE: metadata fallback intentionally EXCLUDES admin.
        // Even if user spoofs user_metadata.role=admin, middleware blocks /admin via DB check.
        const metaRole = data.user.user_metadata?.role;
        if (metaRole === "company") dest = "/firma";
        // admin intentionally excluded — middleware enforces real DB role check
      }
    }

    // Intent je jednokratni onboarding signal — očisti ga za SVE role poslije upotrebe.
    clearStoredIntent();
    clearLoginRedirecting();

    // Jedan, pouzdan redirect — replace() ne dodaje u history
    window.location.replace(dest);
  }

  return (
    <form className="auth-form" onSubmit={submit}>
      <label>
        <span className="label">E-pošta</span>
        <input
          className="field"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="ime@email.com"
          required
        />
      </label>
      <label>
        <span className="label">Lozinka</span>
        <input
          className="field"
          name="password"
          type="password"
          autoComplete="current-password"
          required
        />
      </label>
      <button className="btn blue" type="submit" disabled={loading}>
        {loading ? "Prijava..." : "Prijavi se"}
      </button>
      {error && <p className="notice error" role="alert">{error}</p>}
      <Link className="mini-link" href="/zaboravljena-lozinka">
        Zaboravljena lozinka?
      </Link>
    </form>
  );
}

export function RegisterForm({ selectedRole, intent }: { selectedRole: "candidate" | "company"; intent?: string }) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    setSuccess(false);

    const fd = new FormData(e.currentTarget);
    const email = String(fd.get("email") || "").trim();
    const password = String(fd.get("password") || "");

    if (password.length < 8) {
      setMessage("Lozinka mora imati najmanje 8 znakova.");
      setLoading(false);
      return;
    }

    // Sačuvaj namjeru PRIJE registracije — koristi se za UX redirect poslije
    // potvrde e-pošte / prijave. Intent je SAMO UX, ne utiče na sigurnost/role.
    const effectiveIntent = intent || (selectedRole === "company" ? "employer" : "job_seeker");
    setStoredIntent(effectiveIntent);

    const supabase = createBrowserSupabase();

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { role: selectedRole } }
    });

    if (error) {
      logError("auth.signUp", error);
      setMessage(safeMessage(error, "auth"));
      setLoading(false);
      return;
    }

    setSuccess(true);
    setMessage("Nalog je kreiran. Provjeri e-poštu i potvrdi nalog, pa se prijavi.");
    setLoading(false);
  }

  if (success) {
    return (
      <div className="auth-form">
        <p className="notice success" role="status">{message}</p>
        <Link className="btn blue" href="/login">Idi na prijavu →</Link>
      </div>
    );
  }

  return (
    <form className="auth-form" onSubmit={submit}>
      <input type="hidden" name="role" value={selectedRole} />
      <label>
        <span className="label">E-pošta</span>
        <input
          className="field"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="ime@email.com"
          required
        />
      </label>
      <label>
        <span className="label">Lozinka (min. 8 znakova)</span>
        <input
          className="field"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
        />
      </label>
      <button className="btn blue" type="submit" disabled={loading}>
        {loading
          ? "Kreiranje..."
          : selectedRole === "company"
            ? "Kreiraj nalog firme"
            : intent === "worker"
              ? "Napravi profil za usluge"
              : "Kreiraj nalog"}
      </button>
      {message && !success && <p className="notice error" role="alert">{message}</p>}
      <p className="hint">
        Klikom na dugme prihvataš{" "}
        <Link href="/uslovi-koriscenja" style={{ textDecoration: "underline" }}>uslove korišćenja</Link>
        {" "}i{" "}
        <Link href="/privatnost" style={{ textDecoration: "underline" }}>politiku privatnosti</Link>.
      </p>
    </form>
  );
}
