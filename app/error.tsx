"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("[GlobalError]", error);
  }, [error]);

  return (
    <section className="auth-shell">
      <div className="panel">
        <span className="page-label">Greška</span>
        <h1>Nešto nije prošlo kako treba.</h1>
        <p className="lead">Pokušaj ponovo ili se vrati na početnu.</p>
        <div className="auth-actions">
          <button className="btn blue" onClick={reset}>Pokušaj ponovo</button>
          <Link className="btn ghost" href="/">Početna</Link>
        </div>
      </div>
    </section>
  );
}
