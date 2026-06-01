"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { createBrowserSupabase } from "@/lib/supabase/client";
import { safeMessage, logError } from "@/lib/errors";

type ApplyState = "loading" | "guest" | "wrong-role" | "duplicate" | "closed" | "ready" | "sending" | "done" | "error";

const MESSAGE_MAX = 500;

export function GigApplyForm({ gigId }: { gigId: number }) {
  const { userId, role, ready } = useAuth();
  const [state, setState] = useState<ApplyState>("loading");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!ready) return;
    if (!userId || role === "guest") { setState("guest"); return; }
    // Only candidates may apply — firms/admins should not apply as candidates
    if (role !== "candidate") { setState("wrong-role"); return; }

    async function check() {
      try {
        const supabase = createBrowserSupabase();
        // Confirm gig is still active (public view only returns active gigs)
        const { data: gig } = await supabase
          .from("public_quick_gigs")
          .select("id")
          .eq("id", gigId)
          .maybeSingle();
        if (!gig) { setState("closed"); return; }

        const { data: existing } = await supabase
          .from("quick_gig_applications")
          .select("id")
          .eq("gig_id", gigId)
          .eq("candidate_id", userId!)
          .maybeSingle();
        setState(existing ? "duplicate" : "ready");
      } catch {
        setState("ready");
      }
    }
    check();
  }, [ready, userId, role, gigId]);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!userId || role !== "candidate") { setState("wrong-role"); return; }
    setState("sending");
    setError("");

    const msg = message.trim().slice(0, MESSAGE_MAX);

    try {
      const supabase = createBrowserSupabase();
      // Re-verify gig is active right before insert
      const { data: gig } = await supabase.from("public_quick_gigs").select("id").eq("id", gigId).maybeSingle();
      if (!gig) { setState("closed"); return; }

      const { error: insErr } = await supabase.from("quick_gig_applications").insert({
        gig_id: gigId,
        candidate_id: userId,
        message: msg || null,
      });
      if (insErr) {
        logError("GigApplyForm.submit", insErr);
        setError(safeMessage(insErr, "submit"));
        setState("error");
        return;
      }
      setState("done");
    } catch (err) {
      logError("GigApplyForm.submit", err as { message?: string });
      setError("Greška pri slanju prijave.");
      setState("error");
    }
  }

  if (!ready || state === "loading") return <p className="notice">Provjeravamo nalog...</p>;

  if (state === "guest") return (
    <div className="empty">
      <strong>Prijava zahtijeva nalog</strong>
      <p>Prijavi se kao kandidat da se prijaviš na ovaj angažman.</p>
      <div className="actions" style={{ gap: 8 }}>
        <Link className="btn blue sm" href={`/login?next=/brzi-poslovi/angazmani/${gigId}`}>Prijava</Link>
        <Link className="btn ghost sm" href="/registracija">Registracija</Link>
      </div>
    </div>
  );

  if (state === "wrong-role") return (
    <div className="empty">
      <strong>Samo kandidati mogu da se prijave</strong>
      <p>Prijave na brze angažmane su namijenjene kandidatima. Firme objavljuju angažmane, a ne prijavljuju se.</p>
    </div>
  );

  if (state === "closed") return (
    <div className="empty">
      <strong>Angažman više nije aktivan</strong>
      <p>Ovaj angažman je zatvoren ili još čeka odobrenje.</p>
      <Link className="btn ghost sm" href="/brzi-poslovi/angazmani">Drugi angažmani →</Link>
    </div>
  );

  if (state === "duplicate") return (
    <div className="empty">
      <strong>✓ Već si se prijavio</strong>
      <p>Tvoja prijava je već poslata za ovaj angažman.</p>
    </div>
  );

  if (state === "done") return (
    <div className="empty">
      <strong>✓ Prijava je poslata!</strong>
      <p>Objavljivač angažmana je dobio obavještenje o tvojoj prijavi.</p>
    </div>
  );

  return (
    <form onSubmit={submit}>
      <label style={{ display: "block", marginBottom: 6 }}>
        <span className="label">Poruka (opciono)</span>
        <textarea
          className="textarea" name="message" rows={3}
          placeholder="Kratko o sebi i zašto si dobar za ovaj posao..."
          maxLength={MESSAGE_MAX}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
        <span style={{ fontSize: 11, color: "var(--muted)" }}>{message.length}/{MESSAGE_MAX}</span>
      </label>
      {error && <p className="notice error" style={{ marginBottom: 10 }}>{error}</p>}
      <button className="btn blue" type="submit" disabled={state === "sending"} style={{ width: "100%", justifyContent: "center" }}>
        {state === "sending" ? "Slanje..." : "Prijavi se na angažman →"}
      </button>
    </form>
  );
}
