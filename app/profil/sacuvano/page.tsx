// FIX P2: Redirect premješten na next.config.ts (redirects() funkcija).
// Ovaj fajl više nije potreban jer Next.js 308 redirect na nivou servera
// je efikasniji od React redirect komponente.
// NAPOMENA: Ovaj fajl može biti obrisan iz projekta.
import { redirect } from "next/navigation";
export default function SacuvanoRedirect() {
  redirect("/profil/sacuvani");
}
