/**
 * middleware.ts — Server-side route protection
 *
 * Runs on every request BEFORE any page renders.
 * Uses Supabase SSR cookies to determine auth state server-side.
 * No dependency on client-side useAuth — this runs in Edge Runtime.
 *
 * Rules:
 *  /profil/**  → requires candidate (or admin)
 *  /firma/**   → requires company (or admin)
 *  /admin/**   → requires admin
 *  /login, /registracija → redirect if already logged in
 */

import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";

const PROTECTED: Record<string, string[]> = {
  "/admin":  ["admin"],
  "/firma":  ["company", "admin"],
  "/profil": ["candidate", "admin"],
};

// Paths where already-logged-in users should be redirected away
const AUTH_ONLY_PATHS = ["/login", "/registracija"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ── Build Supabase client that reads cookies ──────────────────────────
  let response = NextResponse.next({
    request: { headers: request.headers },
  });

  const supabaseUrl  = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey  = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // If env vars missing, allow through (build/CI environments)
  if (!supabaseUrl || !supabaseKey) return response;

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() { return request.cookies.getAll(); },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        response = NextResponse.next({ request: { headers: request.headers } });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  // ── Get user — validated server-side (not just from JWT cookie) ────────
  // FIX P0: getSession() reads JWT from cookie without server validation.
  // getUser() sends the JWT to Supabase Auth server for proper validation.
  // This prevents forged/expired tokens from bypassing route protection.
  const { data: { user } } = await supabase.auth.getUser();
  const isLoggedIn = Boolean(user);

  // ── Redirect logged-in users away from login/register ────────────────
  if (isLoggedIn && AUTH_ONLY_PATHS.some(p => pathname === p || pathname.startsWith(p + "/"))) {
    // Role-aware redirect: query DB role so user lands on their real dashboard,
    // not a generic homepage. (RedirectIfAuthed can't run — page never renders.)
    let dest = "/";
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user!.id)
        .maybeSingle();
      const role = profile?.role ?? "candidate";
      dest = role === "company" ? "/firma"
        : role === "admin" ? "/admin"
        : "/profil";
    } catch {
      // DB unreachable — fall back to homepage (harmless for an authed user)
      dest = "/";
    }
    return NextResponse.redirect(new URL(dest, request.url));
  }

  // ── Enforce protected routes ──────────────────────────────────────────
  for (const [prefix, allowedRoles] of Object.entries(PROTECTED)) {
    if (pathname === prefix || pathname.startsWith(prefix + "/")) {
      if (!isLoggedIn) {
        // Not logged in → redirect to login with `next` param
        const loginUrl = new URL("/login", request.url);
        loginUrl.searchParams.set("next", pathname);
        return NextResponse.redirect(loginUrl);
      }

      // Logged in — check role from DB (one query per protected request)
      try {
        const userId = user!.id;
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", userId)
          .maybeSingle();

        const role = profile?.role ?? "guest";

        if (!allowedRoles.includes(role)) {
          // Wrong role — redirect to appropriate home
          const dest = role === "company"
            ? "/firma"
            : role === "candidate"
            ? "/profil"
            : role === "admin"
            ? "/admin"
            : "/";
          return NextResponse.redirect(new URL(dest, request.url));
        }
      } catch {
        // DB unreachable — fail CLOSED: deny access to protected routes on error
        // Better to ask for re-login than to accidentally expose protected content
        const loginUrl = new URL("/login", request.url);
        loginUrl.searchParams.set("next", pathname);
        loginUrl.searchParams.set("error", "session");
        return NextResponse.redirect(loginUrl);
      }

      break; // matched prefix, no need to continue loop
    }
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths EXCEPT:
     * - _next/static (static files)
     * - _next/image  (image optimization)
     * - favicon.ico, robots.txt, sitemap.xml, og-image
     * - public assets
     */
    "/((?!_next/static|_next/image|favicon\\.ico|robots\\.txt|sitemap\\.xml|og-image|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|woff|woff2)).*)",
  ],
};
