import { getActiveBanner } from "@/lib/queries/banners";
import { supabaseUrl } from "@/lib/supabase/config";
import { BannerClickTracker } from "@/components/banner-click-tracker";
import type { BannerPlacement, BannerAudience } from "@/types/domain";
import { getMockBanner, type MockBanner } from "@/lib/mock-banners";

/**
 * Server komponenta — fetch + render aktivnog banera za datu lokaciju.
 * Ako nema banera u bazi, prikazuje polished mock/placeholder banner.
 *
 * Tracking impresije: best-effort, ne blokira render.
 * Tracking klikova: kroz <BannerClickTracker> klijent komponentu.
 * `device` filter se radi kroz CSS klase (.ad-desktop, .ad-mobile).
 */
export async function BannerSlot({
  placement,
  audience = "all",
  className = "",
  showMock = true,
}: {
  placement: BannerPlacement;
  audience?: BannerAudience;
  className?: string;
  showMock?: boolean;
}) {
  // Try to get real banner from database
  let banner = null;
  try {
    banner = await getActiveBanner(placement, audience);
  } catch {
    // Fail silently, fall through to mock
  }

  // Real banner path
  if (banner?.image_path) {
    const imageUrl = banner.image_path.startsWith("http")
      ? banner.image_path
      : `${supabaseUrl}/storage/v1/object/public/banners/${banner.image_path}`;

    const deviceClass =
      banner.device === "desktop" ? "ad-desktop" :
      banner.device === "mobile" ? "ad-mobile" : "";

    const formatClass = banner.format ? `ad-format-${banner.format}` : "";
    const wrapperClass = ["ad-banner", deviceClass, formatClass, className].filter(Boolean).join(" ");

    const inner = (
      /* eslint-disable-next-line @next/next/no-img-element */
      <img
        src={imageUrl}
        alt={banner.title}
        className="ad-banner-img"
        loading="lazy"
      />
    );

    return (
      <aside className={wrapperClass} aria-label="Reklamni banner">
        <span className="ad-label">Sponzorisano</span>
        {banner.target_url ? (
          <BannerClickTracker bannerId={banner.id} href={banner.target_url}>
            {inner}
          </BannerClickTracker>
        ) : (
          inner
        )}
      </aside>
    );
  }

  // Mock / placeholder banner fallback
  // Only show mock banners in development — never in production
  const isDev = process.env.NODE_ENV !== "production";
  if (!showMock || !isDev) return null;

  const mock: MockBanner = getMockBanner(placement);
  const wrapperClass = ["ad-banner", "ad-mock", mock.deviceClass, className].filter(Boolean).join(" ");

  return (
    <aside className={wrapperClass} aria-label="Reklamni prostor">
      <span className="ad-label">Oglas</span>
      <a
        href={mock.targetUrl}
        target="_blank"
        rel="noopener noreferrer sponsored"
        className="ad-banner-link"
        tabIndex={-1}
        aria-hidden="true"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={mock.imageUrl}
          alt="Oglasni prostor"
          className="ad-banner-img"
          loading="lazy"
          width={mock.width}
          height={mock.height}
        />
      </a>
      <div className="ad-placeholder-label">
        <span className="ad-placeholder-text">Vaš banner ovdje</span>
        <span className="ad-placeholder-dim">{mock.label}</span>
      </div>
    </aside>
  );
}
