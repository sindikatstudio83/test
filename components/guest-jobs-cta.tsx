"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth-context";

/** Shows a soft signup nudge only to guests. Hidden once logged in. */
export function GuestJobsCta() {
  const { role, ready } = useAuth();
  if (!ready || role !== "guest") return null;

  return (
    <div className="guest-cta" role="note">
      <span>Napravi nalog da čuvaš oglase, šalješ prijave i pratiš status.</span>
      <div className="guest-cta__actions">
        <Link className="btn blue sm" href="/registracija?intent=job_seeker">Registruj se</Link>
        <Link className="btn ghost sm" href="/login">Prijavi se</Link>
      </div>
    </div>
  );
}
