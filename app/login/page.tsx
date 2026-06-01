import type { Metadata } from "next";
import Link from "next/link";
import { LoginForm } from "@/components/auth-form";
import { RedirectIfAuthed } from "@/components/redirect-if-authed";
import { PageLabel } from "@/components/ui";

export const metadata: Metadata = {
  title: "Prijava",
  description: "Prijavi se na imaposla.me."
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const params = await searchParams;
  return (
    <><RedirectIfAuthed /><section className="auth-shell auth-two">
      <div>
        <PageLabel>Prijava</PageLabel>
        <h1>Uđi na svoj nalog.</h1>
        <p>Unesi e-postu i lozinku. Sistem automatski otvara pregled koji odgovara tvojoj ulozi.</p>
        <div className="auth-actions">
          <Link className="btn lime" href="/registracija">Kreiraj nalog</Link>
          <Link className="btn ghost" href="/registracija?role=company">Registruj firmu</Link>
        </div>
      </div>
      <LoginForm nextPath={params.next || null} />
    </section></>
  );
}
