/**
 * TowerBanner — server komponenta
 * Prikazuje se samo na desktopu (position: fixed, van .wrap okvira).
 * Fetchuje baner iz DB za placement jobs_left_tower ili jobs_right_tower.
 * Ako nema aktivnog banera u bazi, prikazuje placeholder sa "Vaš oglas ovdje".
 * Na mobilnom/tabletu je nevidljiva (CSS display:none ispod 1400px).
 */

import { getActiveBanner } from "@/lib/queries/banners";
import { supabaseUrl } from "@/lib/supabase/config";
import { BannerClickTracker } from "@/components/banner-click-tracker";
import type { BannerPlacement } from "@/types/domain";
import type { CSSProperties } from "react";

type Side = "left" | "right";

export async function TowerBanner({ side }: { side: Side }) {
  const placement: BannerPlacement = side === "left" ? "jobs_left_tower" : "jobs_right_tower";

  let banner = null;
  try {
    banner = await getActiveBanner(placement);
  } catch {
    /* fail silently */
  }

  const posStyle: CSSProperties = {
    position: "fixed",
    top: "90px",
    [side]: "calc(50% - 590px - 10px - 160px)",
    width: "160px",
    zIndex: 10,
    display: "flex",
    flexDirection: "column" as const,
    gap: "10px",
  };

  // Real banner iz baze
  if (banner?.image_path) {
    const imageUrl = banner.image_path.startsWith("http")
      ? banner.image_path
      : `${supabaseUrl}/storage/v1/object/public/banners/${banner.image_path}`;

    return (
      <aside
        className="tower-banner-fixed"
        style={posStyle}
        aria-label="Reklamni banner"
      >
        <span className="ad-label" style={{ position: "static", marginBottom: 4 }}>
          Sponzorisano
        </span>
        {banner.target_url ? (
          <BannerClickTracker bannerId={banner.id} href={banner.target_url}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageUrl}
              alt={banner.title}
              style={{ width: "100%", height: "auto", borderRadius: 12, display: "block" }}
              loading="lazy"
            />
          </BannerClickTracker>
        ) : (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={imageUrl}
            alt={banner.title}
            style={{ width: "100%", height: "auto", borderRadius: 12, display: "block" }}
            loading="lazy"
          />
        )}
      </aside>
    );
  }

  // Placeholder — prikazuje se samo ako admin želi (showPlaceholder=true default)
  return (
    <aside
      className="tower-banner-fixed tower-banner-placeholder"
      style={posStyle}
      aria-label="Reklamni prostor"
    >
      <div
        style={{
          background: "var(--soft)",
          border: "2px dashed var(--line)",
          borderRadius: 14,
          padding: "16px 10px",
          textAlign: "center",
          minHeight: 240,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
        }}
      >
        <span style={{ fontSize: 28 }}>📢</span>
        <span
          style={{
            fontSize: 11,
            fontWeight: 800,
            color: "var(--muted)",
            letterSpacing: ".04em",
            textTransform: "uppercase",
          }}
        >
          Vaš oglas
        </span>
        <span style={{ fontSize: 10, color: "var(--muted)" }}>160 × 600</span>
      </div>
    </aside>
  );
}
