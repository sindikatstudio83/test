"use client";

import type { ReactNode } from "react";
import { createBrowserSupabase } from "@/lib/supabase/client";

/**
 * Klijent wrapper koji intercepta klik na banner i registruje ga u DB
 * preko sigurne RPC funkcije, pa onda otvara link u novom tabu.
 */
export function BannerClickTracker({
  bannerId, href, children
}: {
  bannerId: number;
  href: string;
  children: ReactNode;
}) {
  function onClick() {
    // Best effort — ne čekamo response, fire and forget
    try {
      const supabase = createBrowserSupabase();
      supabase.rpc("increment_banner_click", { p_banner_id: bannerId }).then(() => {});
    } catch {
      // ignor
    }
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer sponsored"
      onClick={onClick}
      className="ad-banner-link"
    >
      {children}
    </a>
  );
}
