import type { Metadata } from "next";
import Link from "next/link";
import { RegisterForm } from "@/components/auth-form";
import { RedirectIfAuthed } from "@/components/redirect-if-authed";
import { PageLabel } from "@/components/ui";

export const metadata: Metadata = {
  title: "Registracija",
  description: "Kreiraj nalog na imaposla.me — traži posao, nudi brze usluge ili zapošljavaj."
};

type Intent = "job_seeker" | "worker" | "employer";

function resolve(searchRole?: string, searchIntent?: string): { role: "candidate" | "company"; intent: Intent } {
  if (searchIntent === "worker") return { role: "candidate", intent: "worker" };
  if (searchIntent === "employer" || searchRole === "company") return { role: "company", intent: "employer" };
  if (searchIntent === "job_seeker") return { role: "candidate", intent: "job_seeker" };
  if (searchRole === "candidate") return { role: "candidate", intent: "job_seeker" };
  return { role: "candidate", intent: "job_seeker" };
}

const COPY: Record<Intent, { lead: string }> = {
  job_seeker: { lead: "Apliciraš na oglase, praviš biografiju i pratiš svoje prijave." },
  worker: { lead: "Praviš javni profil sa svojim uslugama (konobar, moler, hostesa…) da te firme i ljudi kontaktiraju za kratke angažmane." },
  employer: { lead: "Objavljuješ oglase, pregledaš prijave i tražiš radnike za kratke angažmane." },
};

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ role?: string; intent?: string }> }) {
  const params = await searchParams;
  const { role, intent } = resolve(params.role, params.intent);
  const copy = COPY[intent];

  return (
    <><RedirectIfAuthed /><section className="auth-shell auth-two">
      <div>
        <PageLabel>Registracija</PageLabel>
        <h1>Šta želiš da radiš?</h1>
        <p>{copy.lead}</p>

        <div className="reg-intent-list" role="group" aria-label="Izaberi namjeru">
          <Link
            className={`reg-intent ${intent === "job_seeker" ? "reg-intent--active" : ""}`}
            href="/registracija?intent=job_seeker"
          >
            <strong>Tražim posao</strong>
            <span>Apliciram na oglase, pravim biografiju i pratim prijave.</span>
          </Link>
          <Link
            className={`reg-intent ${intent === "worker" ? "reg-intent--active" : ""}`}
            href="/registracija?intent=worker"
          >
            <strong>Nudim brze usluge</strong>
            <span>Pravim javni profil da me firme i ljudi kontaktiraju za kratke angažmane.</span>
          </Link>
          <Link
            className={`reg-intent ${intent === "employer" ? "reg-intent--active" : ""}`}
            href="/registracija?intent=employer"
          >
            <strong>Zapošljavam</strong>
            <span>Objavljujem oglase, pregledam prijave i tražim radnike.</span>
          </Link>
        </div>

        <div className="auth-actions">
          <Link className="btn ghost" href="/login">Već imam nalog → Prijava</Link>
        </div>
      </div>
      <RegisterForm selectedRole={role} intent={intent} />
    </section></>
  );
}
