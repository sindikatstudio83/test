// Helpers za onboarding intent + login-redirect flag.
// Intent je SAMO UX signal (kuda preusmjeriti korisnika poslije prijave).
// Ne utiče na sigurnost ni na role — autorizacija ide kroz DB/middleware.

const INTENT_KEY = "ip_intent";
const REDIRECT_KEY = "ip_login_redirecting";
const REDIRECT_FRESH_MS = 10_000; // flag je "svjež" 10s

/** Pročitaj sačuvanu namjeru (session ima prioritet, pa local kao backup). */
export function getStoredIntent(): string | null {
  try {
    return sessionStorage.getItem(INTENT_KEY) || localStorage.getItem(INTENT_KEY);
  } catch {
    return null;
  }
}

/** Sačuvaj namjeru u oba storage-a (jednokratni onboarding signal). */
export function setStoredIntent(intent: string): void {
  try {
    sessionStorage.setItem(INTENT_KEY, intent);
    localStorage.setItem(INTENT_KEY, intent);
  } catch {
    /* storage nedostupan (npr. privatni mod) — ignoriši */
  }
}

/** Obriši namjeru iz oba storage-a. Zove se poslije iskorišćenog redirecta. */
export function clearStoredIntent(): void {
  try {
    sessionStorage.removeItem(INTENT_KEY);
    localStorage.removeItem(INTENT_KEY);
  } catch {
    /* ignoriši */
  }
}

/** Označi da login upravo radi redirect (timestamp, ne trajna "1"). */
export function setLoginRedirecting(): void {
  try {
    sessionStorage.setItem(REDIRECT_KEY, String(Date.now()));
  } catch {
    /* ignoriši */
  }
}

/** Obriši login-redirect flag (npr. ako login padne ili poslije odluke o destinaciji). */
export function clearLoginRedirecting(): void {
  try {
    sessionStorage.removeItem(REDIRECT_KEY);
  } catch {
    /* ignoriši */
  }
}

/**
 * Da li je login-redirect flag svjež (mlađi od 10s)?
 * Ako je star/nevalidan, briše ga i vraća false (ne blokira redirect).
 */
export function isFreshLoginRedirect(): boolean {
  try {
    const raw = sessionStorage.getItem(REDIRECT_KEY);
    if (!raw) return false;
    const ts = Number(raw);
    if (Number.isFinite(ts) && Date.now() - ts < REDIRECT_FRESH_MS) {
      return true;
    }
    // star ili nevalidan — očisti i nastavi normalno
    sessionStorage.removeItem(REDIRECT_KEY);
    return false;
  } catch {
    return false;
  }
}
