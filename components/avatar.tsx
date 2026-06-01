"use client";

import { useState } from "react";
import { initials } from "@/lib/format";
import { supabaseUrl } from "@/lib/supabase/config";
import type { ImageBucket } from "@/components/image-upload";

export function Avatar({
  bucket, path, fallback, size = 40, shape = "circle"
}: {
  bucket: ImageBucket;
  path: string | null | undefined;
  fallback: string;
  size?: number;
  shape?: "circle" | "rounded";
}) {
  const [imgError, setImgError] = useState(false);

  const url = path ? `${supabaseUrl}/storage/v1/object/public/${bucket}/${path}` : null;
  const radius = shape === "circle" ? "50%" : "10px";
  const dim = `${size}px`;
  const fallbackText = initials(fallback) || "?";
  const showFallback = !url || imgError;

  return (
    <div
      className="avatar-image"
      style={{ width: dim, height: dim, borderRadius: radius, fontSize: Math.round(size * 0.36) }}
      aria-label={fallback}
    >
      {!showFallback ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={url!}
          alt={fallback}
          style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: radius }}
          onError={() => setImgError(true)}
        />
      ) : (
        <span>{fallbackText}</span>
      )}
    </div>
  );
}
