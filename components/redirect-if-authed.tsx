"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { roleHomes } from "@/lib/labels";
import { getStoredIntent, clearStoredIntent, isFreshLoginRedirect } from "@/lib/auth-intent";

/**
 * Redirects already-logged-in users away from /login and /registracija.
 * Skips redirect only if LoginForm is ACTIVELY handling it (fresh timestamp flag).
 */
export function RedirectIfAuthed() {
  const { role, ready } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!ready) return;
    if (role === "guest") return;

    // Preskoči samo ako je login-redirect svjež (<10s). Stari flag se sam briše.
    if (isFreshLoginRedirect()) return;

    let dest = roleHomes[role as Exclude<typeof role, "guest">];

    // Candidate: ako postoji sačuvana namjera, vodi na odgovarajuću stranicu (samo UX)
    if (role === "candidate") {
      const intent = getStoredIntent();
      if (intent === "worker") dest = "/profil/brzi-profil";
      else if (intent === "job_seeker") dest = "/profil/biografija";
    }

    // Intent je jednokratni signal — očisti ga za SVE role poslije upotrebe.
    clearStoredIntent();

    router.replace(dest);
  }, [ready, role, router]);

  return null;
}
