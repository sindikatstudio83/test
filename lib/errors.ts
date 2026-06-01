/**
 * Konvertuje raw DB/auth grešku u prijateljsku poruku za korisnika.
 * NIKAD ne prikazujemo error.message direktno — može otkriti strukturu baze,
 * imena tabela, RLS policy nazive, infinite recursion stack itd.
 *
 * Originalna greška se loguje kroz console.error u istom mjestu pozivanja.
 */

type AuthOrPgError = { message?: string; code?: string; status?: number } | null | undefined;

export function safeMessage(error: AuthOrPgError, context?: "auth" | "save" | "submit" | "load" | "delete"): string {
  if (!error) return "Nešto nije prošlo kako treba. Pokušaj ponovo.";

  const code = error.code || "";
  const msg = (error.message || "").toLowerCase();

  // Auth specifični slučajevi koji su sigurni za prikaz
  if (msg.includes("invalid login credentials") || msg.includes("invalid_credentials")) {
    return "E-pošta ili lozinka nijesu tačni.";
  }
  if (msg.includes("email not confirmed")) {
    return "Nalog nije potvrđen. Provjeri e-poštu i klikni na link za potvrdu.";
  }
  if (msg.includes("user already") || msg.includes("already registered") || msg.includes("already exists")) {
    return "Nalog sa ovom e-poštom već postoji. Prijavi se ili zatraži novu lozinku.";
  }
  if (msg.includes("rate limit") || msg.includes("too many")) {
    return "Previše pokušaja. Sačekaj par minuta i pokušaj ponovo.";
  }
  if (msg.includes("password should be") || msg.includes("password is too")) {
    return "Lozinka mora imati najmanje 8 znakova.";
  }
  if (msg.includes("invalid email") || msg.includes("email format")) {
    return "E-pošta nije u ispravnom formatu.";
  }
  if (msg.includes("session") && msg.includes("expired")) {
    return "Sesija je istekla. Prijavi se ponovo.";
  }

  // PostgreSQL/PostgREST kodovi
  if (code === "23505") return "Ova vrijednost već postoji u sistemu.";
  if (code === "23503") return "Povezani podaci nedostaju ili su neispravni.";
  if (code === "42501" || code === "PGRST301") return "Nemaš dozvolu za ovu akciju.";
  if (code === "PGRST116") return "Traženi podatak nije pronađen.";

  // Sve ostalo (uključujući "infinite recursion", "permission denied",
  // "syntax error", "relation does not exist" itd.) — generička poruka
  switch (context) {
    case "auth":   return "Prijava trenutno nije moguća. Pokušaj ponovo za par minuta.";
    case "save":   return "Trenutno nije moguće sačuvati. Pokušaj ponovo za par trenutaka.";
    case "submit": return "Slanje trenutno nije moguće. Pokušaj ponovo za par minuta.";
    case "load":   return "Učitavanje trenutno nije moguće. Osvježi stranicu za par trenutaka.";
    case "delete": return "Brisanje trenutno nije moguće. Pokušaj ponovo.";
    default:       return "Nešto nije prošlo kako treba. Pokušaj ponovo.";
  }
}

/** Logger koji ide u console (vidljiv samo developeru u browser dev tools, ne korisniku) */
export function logError(scope: string, error: AuthOrPgError) {
  if (!error) return;
  const code = error.code ? ` [${error.code}]` : "";
  console.error(`[${scope}]${code}`, error.message || error);
}
