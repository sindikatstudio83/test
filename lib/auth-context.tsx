"use client";

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { createBrowserSupabase } from "@/lib/supabase/client";
import { normalizeRole } from "@/lib/auth-role";
import type { UserRole } from "@/types/domain";

type AuthState = {
  role: UserRole;
  userId: string | null;
  email: string | null;
  /** true only after role is fully resolved from DB (or definitively failed) */
  ready: boolean;
};

const initialState: AuthState = { role: "guest", userId: null, email: null, ready: false };

const AuthContext = createContext<AuthState>(initialState);

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>(initialState);
  // Use a ref to track mounted state — avoids calling setState after unmount
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    const supabase = createBrowserSupabase();

    async function resolveRole(session: Session): Promise<AuthState> {
      const user = session.user;

      // Step 1: Authoritative role comes from DB profiles table
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .maybeSingle();

        if (!error && data?.role) {
          const dbRole = normalizeRole(data.role);
          return {
            role: dbRole !== "guest" ? dbRole : "candidate",
            userId: user.id,
            email: user.email ?? null,
            ready: true,
          };
        }

        // Profile row missing — trigger should have created it.
        // Best-effort upsert as safe default; admin can correct via admin panel.
        if (!error && !data) {
          await supabase.from("profiles").upsert(
            { id: user.id, email: user.email, role: "candidate" },
            { onConflict: "id" }
          );
          return { role: "candidate", userId: user.id, email: user.email ?? null, ready: true };
        }
      } catch {
        // Network or RLS error — fail closed
      }

      // Step 2: DB unavailable — deny access to protected routes
      return { role: "guest", userId: null, email: null, ready: true };
    }

    async function loadFromSession() {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.user) {
        if (mountedRef.current) {
          setState({ role: "guest", userId: null, email: null, ready: true });
        }
        return;
      }

      const resolved = await resolveRole(session);
      if (mountedRef.current) setState(resolved);
    }

    loadFromSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event: string, session: import("@supabase/supabase-js").Session | null) => {
        if (event === "SIGNED_OUT" || !session) {
          if (mountedRef.current) {
            setState({ role: "guest", userId: null, email: null, ready: true });
          }
          return;
        }

        if (event === "SIGNED_IN") {
          // FIX: No setState-inside-setState. 
          // Instead, directly trigger async resolution and set state once with the result.
          if (mountedRef.current) {
            // Reset to loading state first (separate synchronous setState call)
            setState({ role: "guest", userId: null, email: null, ready: false });
            // Then resolve asynchronously
            resolveRole(session).then((resolved) => {
              if (mountedRef.current) setState(resolved);
            });
          }
          return;
        }
        // TOKEN_REFRESHED: silently keep current state — no update needed
      }
    );

    return () => {
      mountedRef.current = false;
      subscription.unsubscribe();
    };
  }, []);

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>;
}
