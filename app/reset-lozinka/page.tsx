"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { createBrowserSupabase } from "@/lib/supabase/client";
import { safeMessage, logError } from "@/lib/errors";
import { PageLabel } from "@/components/ui";

type Stage = "verifying" | "ready" | "done" | "error" | "expired";

function ResetLozinkaInner() {
  const searchParams = useSearchParams();
  const [stage, setStage] = useState<Stage>("verifying");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [pwError, setPwError] = useState("");

  useEffect(() => {
    const supabase = createBrowserSupabase();

    // ── PKCE flow (Supabase SSR default) ─────────────────────────
    // Email link format: /reset-lozinka?token_hash=...&type=recovery
    const tokenHash = searchParams.get("token_hash");
    const type = searchParams.get("type");

    if (tokenHash && type === "recovery") {
      supabase.auth
        .verifyOtp({ token_hash: tokenHash, type: "recovery" })
        .then(({ error: verifyErr }: { error: { message: string } | null }) => {
          if (verifyErr) {
            logError("reset.verifyOtp", verifyErr);
            setStage("expired");
          } else {
            setStage("ready");
          }
        });
      return;
    }

    // ── Legacy implicit flow ──────────────────────────────────────
    // Email link format: /reset-lozinka#access_token=...&type=recovery
    // Supabase JS client handles hash automatically and fires PASSWORD_RECOVERY
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event: string) => {
      if (event === "PASSWORD_RECOVERY") {
        setStage("ready");
      }
    });

    // Check if there's already an active recovery session
    supabase.auth.getSession().then(({ data: { session } }: { data: { session: { user?: unknown } | null } }) => {
      if (session) {
        setStage("ready");
      } else {
        // No token in URL params, no hash, no session — wait 2s then show error
        const t = setTimeout(() => {
          setStage(prev => prev === "verifying" ? "expired" : prev);
        }, 2500);
        return () => clearTimeout(t);
      }
    });

    return () => subscription.unsubscribe();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPwError("");
    setLoading(true);

    const fd = new FormData(e.currentTarget);
    const password = String(fd.get("password") || "");
    const confirm = String(fd.get("confirm") || "");

    if (password.length < 8) {
      setPwError("Lozinka mora imati najmanje 8 znakova.");
      setLoading(false);
      return;
    }
    if (password !== confirm) {
      setPwError("Lozinke se ne poklapaju.");
      setLoading(false);
      return;
    }

    const supabase = createBrowserSupabase();
    const { error: err } = await supabase.auth.updateUser({ password });

    if (err) {
      logError("reset.updateUser", err);
      setPwError(safeMessage(err, "save"));
      setLoading(false);
      return;
    }

    // Sign out after reset so user has to log in fresh with new password
    await supabase.auth.signOut();
    setStage("done");
    setLoading(false);
  }

  return (
    <section className="auth-shell auth-two">
      {/* Left info column */}
      <div>
        <PageLabel>Pristup nalogu</PageLabel>
        <h1>
          {stage === "done" ? "Gotovo." :
           stage === "expired" ? "Link istekao." :
           "Nova lozinka."}
        </h1>
        <p>
          {stage === "done"
            ? "Lozinka je uspješno promijenjena. Možeš se prijaviti sa novom lozinkom."
            : stage === "expired"
            ? "Reset link je istekao ili je već iskorišćen. Zatraži novi."
            : stage === "verifying"
            ? "Verifikacija reset linka..."
            : "Unesi novu lozinku za tvoj nalog. Mora imati najmanje 8 znakova."}
        </p>
        <div className="auth-actions" style={{ marginTop: 16 }}>
          <Link className="btn ghost" href="/login">← Prijava</Link>
        </div>
      </div>

      {/* Right form column */}
      <div>
        {/* VERIFYING */}
        {stage === "verifying" && (
          <div className="form-card" style={{ textAlign: "center", padding: "32px 24px" }}>
            <div className="reset-spinner" />
            <p style={{ marginTop: 14, color: "var(--muted)", fontSize: 14 }}>
              Verifikacija reset linka...
            </p>
          </div>
        )}

        {/* EXPIRED / ERROR */}
        {(stage === "expired" || stage === "error") && (
          <div className="form-card">
            <div style={{ textAlign: "center", padding: "8px 0" }}>
              <div style={{ fontSize: 36, marginBottom: 10 }}>⏰</div>
              <p style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>Link je istekao</p>
              <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: 16, lineHeight: 1.5 }}>
                Reset linkovi važe 1 sat od slanja. Zatraži novi link.
              </p>
            </div>
            {error && <p className="notice error">{error}</p>}
            <Link className="btn blue" href="/zaboravljena-lozinka">
              Zatraži novi link →
            </Link>
            <Link className="btn ghost" href="/login" style={{ textAlign: "center" }}>
              Nazad na prijavu
            </Link>
          </div>
        )}

        {/* FORM — ready to set password */}
        {stage === "ready" && (
          <form className="auth-form" onSubmit={submit}>
            <label>
              <span className="label">Nova lozinka</span>
              <input
                className="field"
                name="password"
                type="password"
                autoComplete="new-password"
                minLength={8}
                placeholder="Minimum 8 znakova"
                required
              />
            </label>
            <label>
              <span className="label">Potvrdi lozinku</span>
              <input
                className="field"
                name="confirm"
                type="password"
                autoComplete="new-password"
                minLength={8}
                placeholder="Ponovi novu lozinku"
                required
              />
            </label>
            <button className="btn blue" type="submit" disabled={loading}>
              {loading ? "Čuvanje..." : "Postavi novu lozinku"}
            </button>
            {pwError && <p className="notice error" role="alert">{pwError}</p>}
          </form>
        )}

        {/* DONE */}
        {stage === "done" && (
          <div className="form-card" style={{ textAlign: "center" }}>
            <div style={{ fontSize: 40, marginBottom: 10 }}>✅</div>
            <p style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>Lozinka promijenjena</p>
            <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: 20, lineHeight: 1.5 }}>
              Možeš se prijaviti sa novom lozinkom.
            </p>
            <Link className="btn blue" href="/login">Idi na prijavu →</Link>
          </div>
        )}
      </div>
    </section>
  );
}

export default function ResetLozinkaPage() {
  return (
    <Suspense fallback={
      <section className="auth-shell">
        <div className="form-card" style={{ textAlign: "center", padding: 32 }}>
          <div className="reset-spinner" />
        </div>
      </section>
    }>
      <ResetLozinkaInner />
    </Suspense>
  );
}
