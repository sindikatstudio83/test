import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Stranica nije pronađena"
};

export default function NotFound() {
  return (
    <section className="auth-shell">
      <div className="panel">
        <span className="page-label">404</span>
        <h1>Stranica nije pronađena.</h1>
        <p className="lead">Ova adresa ne postoji ili je premještena.</p>
        <div className="auth-actions">
          <Link className="btn blue" href="/oglasi">Oglasi za posao</Link>
          <Link className="btn ghost" href="/">Početna</Link>
        </div>
      </div>
    </section>
  );
}
