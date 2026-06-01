/* eslint-disable @next/next/no-img-element */
"use client";

import { useState, useRef } from "react";
import { createBrowserSupabase } from "@/lib/supabase/client";
import { supabaseUrl } from "@/lib/supabase/config";
import { safeMessage, logError } from "@/lib/errors";
import { initials } from "@/lib/format";

const MAX_BYTES_DEFAULT = 2 * 1024 * 1024; // 2MB
const MAX_BYTES_BANNERS = 5 * 1024 * 1024; // 5MB
// SVG removed: can contain JavaScript (XSS risk) when served as active SVG
const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/gif"];

// All valid Supabase Storage buckets used in this project
export type ImageBucket = "avatars" | "company-logos" | "banners" | "worker-photos";

/**
 * Generates a public Supabase Storage URL without needing the Supabase client.
 * This is hydration-safe and works in both server and client components.
 * Path convention: {bucket}/{ownerUserId}/{timestamp}.ext
 */
export function getPublicStorageUrl(bucket: ImageBucket, path: string | null | undefined): string | null {
  if (!path) return null;
  if (path.startsWith("http")) return path; // already a full URL
  return `${supabaseUrl}/storage/v1/object/public/${bucket}/${path}`;
}

type Props = {
  bucket: ImageBucket;
  ownerUserId: string;
  currentPath: string | null;
  fallbackText: string;
  shape?: "circle" | "rounded";
  size?: number;
  onUploaded: (newPath: string) => Promise<void> | void;
};

/**
 * Reusable image upload with preview, validation, loading state and errors.
 * Path convention: {bucket}/{ownerUserId}/{timestamp}.ext
 * RLS: owner can only write under their own user folder.
 *
 * FIX: Uses getPublicStorageUrl() instead of supabase.storage.getPublicUrl()
 * to avoid needing a Supabase client for URL generation (hydration-safe).
 */
export function ImageUpload({
  bucket, ownerUserId, currentPath, fallbackText,
  shape = "circle", size = 88, onUploaded
}: Props) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const maxBytes = bucket === "banners" ? MAX_BYTES_BANNERS : MAX_BYTES_DEFAULT;
  const publicUrl = getPublicStorageUrl(bucket, currentPath);

  async function handleFile(file: File) {
    setError("");

    if (!ALLOWED.includes(file.type)) {
      setError("Dozvoljeni formati: JPG, PNG, WebP, GIF.");
      return;
    }
    if (file.size > maxBytes) {
      setError(`Slika je prevelika. Maksimalno ${bucket === "banners" ? "5" : "2"} MB.`);
      return;
    }

    setUploading(true);
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    // FIX: Always use ownerUserId as the first path segment so RLS passes
    const path = `${ownerUserId}/${Date.now()}.${ext}`;

    const supabase = createBrowserSupabase();
    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(path, file, { upsert: false, cacheControl: "3600" });

    if (uploadError) {
      logError(`ImageUpload.${bucket}`, uploadError);
      setError(safeMessage(uploadError, "save"));
      setUploading(false);
      return;
    }

    // Best-effort: delete old image if it differs
    if (currentPath && currentPath !== path) {
      supabase.storage.from(bucket).remove([currentPath]).catch(() => {});
    }

    try {
      await onUploaded(path);
    } catch (e) {
      logError(`ImageUpload.${bucket}.onUploaded`, e as { message?: string });
      setError("Slika je upload-ovana ali nije sačuvana. Osvježi stranicu.");
    }

    setUploading(false);
  }

  const dim = `${size}px`;
  const radius = shape === "circle" ? "50%" : "16px";

  return (
    <div className="image-upload">
      <div
        className="image-upload-preview"
        style={{ width: dim, height: dim, borderRadius: radius }}
        aria-label={publicUrl ? "Trenutna slika" : "Inicijali"}
      >
        {publicUrl ? (
          <img
            src={publicUrl}
            alt=""
            style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: radius }}
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
          />
        ) : (
          <span>{initials(fallbackText) || "?"}</span>
        )}
        {uploading && <div className="image-upload-overlay">↑</div>}
      </div>

      <div className="image-upload-actions">
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          style={{ display: "none" }}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
            e.target.value = "";
          }}
        />
        <button
          type="button"
          className="btn ghost sm"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? "Slanje..." : publicUrl ? "Promijeni sliku" : "Otpremi sliku"}
        </button>
        {publicUrl && !uploading && (
          <button
            type="button"
            className="btn ghost sm"
            style={{ color: "var(--red)" }}
            onClick={async () => {
              setUploading(true);
              const supabase = createBrowserSupabase();
              if (currentPath) {
                await supabase.storage.from(bucket).remove([currentPath]).catch(() => {});
              }
              await onUploaded("");
              setUploading(false);
            }}
          >
            Ukloni
          </button>
        )}
      </div>

      <p className="hint" style={{ margin: 0 }}>
        {bucket === "banners" ? "JPG, PNG, WebP, GIF. Max 5 MB." : "JPG, PNG, WebP, GIF. Max 2 MB."}
      </p>
      {error && <p className="notice error" role="alert" style={{ marginTop: 6 }}>{error}</p>}
    </div>
  );
}

/**
 * Client-side avatar/logo display — hydration-safe, uses getPublicStorageUrl.
 * Use this in client components.
 */
export function AvatarImage({
  bucket, path, fallback, size = 40, shape = "circle"
}: {
  bucket: ImageBucket;
  path: string | null | undefined;
  fallback: string;
  size?: number;
  shape?: "circle" | "rounded";
}) {
  const url = getPublicStorageUrl(bucket, path);
  const radius = shape === "circle" ? "50%" : "10px";
  const dim = `${size}px`;

  return (
    <div
      className="avatar-image"
      style={{ width: dim, height: dim, borderRadius: radius, fontSize: Math.round(size * 0.36) }}
      aria-label={fallback}
    >
      {url ? (
        <img
          src={url}
          alt={fallback}
          style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: radius }}
          onError={(e) => {
            // On error, hide broken image and show initials fallback
            const parent = (e.target as HTMLImageElement).parentElement;
            if (parent) {
              (e.target as HTMLImageElement).style.display = "none";
              const span = document.createElement("span");
              span.textContent = initials(fallback) || "?";
              parent.appendChild(span);
            }
          }}
        />
      ) : (
        <span>{initials(fallback) || "?"}</span>
      )}
    </div>
  );
}

