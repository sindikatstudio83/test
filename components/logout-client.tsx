"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { createBrowserSupabase } from "@/lib/supabase/client";
import { clearStoredIntent, clearLoginRedirecting } from "@/lib/auth-intent";

export function LogoutClient() {
  const router = useRouter();

  useEffect(() => {
    async function doLogout() {
      const supabase = createBrowserSupabase();
      await supabase.auth.signOut();
      clearStoredIntent();
      clearLoginRedirecting();
      router.replace("/login");
    }
    doLogout();
  }, [router]);

  return (
    <div className="auth-shell">
      <p className="lead" style={{ textAlign: "center" }}>Odjava u toku...</p>
    </div>
  );
}
