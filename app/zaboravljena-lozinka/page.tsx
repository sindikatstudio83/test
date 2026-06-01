"use client";

import Link from "next/link";
import { useState } from "react";
import { createBrowserSupabase } from "@/lib/supabase/client";
import { safeMessage, logError } from "@/lib/errors";
import { PageLabel } from "@/components/ui";

export default function ZaboravljenaLozinkaPage() {
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const fd = new FormData(e.currentTarget);
    const email = String(fd.get("email") || "").trim();

    const supabase = createBrowserSupabase();
    const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-lozinka`
    });

    if (err) {
      logError("auth.reset", err);
      setError(safeMessage(err, "auth"));
      setLoading(false);
      return;
    }

    setSent(true);
    setLoading(false);
  }

  return (
    <section className="auth-shell auth-two">
      <div>
        <PageLabel>Pristup nalogu</PageLabel>
        <h1>Zaboravljena lozinka</h1>
        <p>Upiši e-postu svog naloga. Poslat ćemo ti link za postavljanje nove lozinke.</p>
        <div className="auth-actions">
          <Link className="btn ghost" href="/login">← Nazad na prijavu</Link>
        </div>
      </div>

      {sent ? (
        <div className="form-card">
          <p style={{ fontSize: 16, fontWeight: 700 }}>✓ Link je poslat</p>
          <p className="sub">Provjeri email i klikni na link za resetovanje lozinke. Ako ne vidiš email, provjeri spam.</p>
          <Link className="btn ghost" href="/login">Nazad na prijavu</Link>
        </div>
      ) : (
        <form className="auth-form" onSubmit={submit}>
          <label>
            <span className="label">E-pošta</span>
            <input
              className="field"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="tvoja@email.com"
              required
            />
          </label>
          <button className="btn blue" type="submit" disabled={loading}>
            {loading ? "Slanje..." : "Pošalji link za reset"}
          </button>
          {error && <p className="notice error">{error}</p>}
        </form>
      )}
    </section>
  );
}
