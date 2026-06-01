"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { supabaseUrl } from "@/lib/supabase/config";
import { createBrowserSupabase } from "@/lib/supabase/client";
import type { Banner } from "@/types/domain";

interface Props {
  banners: Banner[];
  autoPlayMs?: number;
}

export function HeroBannerCarousel({ banners, autoPlayMs = 6000 }: Props) {
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);
  // Respect prefers-reduced-motion — disable autoplay entirely
  const [reducedMotion, setReducedMotion] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const count = banners.length;

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  // Pause autoplay when tab is hidden
  useEffect(() => {
    function onVisibility() {
      if (document.hidden) setPaused(true);
      else setPaused(false);
    }
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  const goTo = useCallback(
    (idx: number) => setCurrent(((idx % count) + count) % count),
    [count]
  );
  const next = useCallback(() => goTo(current + 1), [current, goTo]);
  const prev = useCallback(() => goTo(current - 1), [current, goTo]);

  useEffect(() => {
    // Do not autoplay if reduced motion is preferred or manually paused
    if (paused || reducedMotion || count <= 1) return;
    timerRef.current = setTimeout(next, autoPlayMs);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [current, paused, reducedMotion, autoPlayMs, next, count]);

  if (!count) return null;

  const banner = banners[current];
  const imageUrl = banner.image_path?.startsWith("http")
    ? banner.image_path
    : `${supabaseUrl}/storage/v1/object/public/banners/${banner.image_path}`;

  function handleClick() {
    if (!banner.target_url) return;
    // Track click best-effort
    try {
      const supabase = createBrowserSupabase();
      supabase.rpc("increment_banner_click", { p_banner_id: banner.id }).then(() => {});
    } catch { /* ignore */ }
    window.open(banner.target_url, "_blank", "noopener,noreferrer");
  }

  return (
    <div
      className="hero-carousel"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={() => setPaused(true)}
      onTouchEnd={() => setPaused(false)}
      role="region"
      aria-label="Sponzorisani baneri"
      aria-roledescription="carousel"
    >
      <div className="hero-carousel__track" style={{ cursor: banner.target_url ? "pointer" : "default" }} onClick={handleClick}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageUrl}
          alt={banner.title}
          className="hero-carousel__img"
          loading="lazy"
        />
        <span className="ad-label">Sponzorisano</span>
      </div>

      {count > 1 && (
        <>
          <button
            className="hero-carousel__arrow hero-carousel__arrow--prev"
            onClick={(e) => { e.stopPropagation(); prev(); }}
            aria-label="Prethodni"
          >‹</button>
          <button
            className="hero-carousel__arrow hero-carousel__arrow--next"
            onClick={(e) => { e.stopPropagation(); next(); }}
            aria-label="Sljedeći"
          >›</button>
          <div className="hero-carousel__dots" role="tablist">
            {banners.map((_, i) => (
              <button
                key={i}
                role="tab"
                aria-selected={i === current}
                className={`hero-carousel__dot${i === current ? " active" : ""}`}
                onClick={() => goTo(i)}
                aria-label={`Baner ${i + 1}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
