"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createBrowserSupabase } from "@/lib/supabase/client";
import { ImageUpload } from "@/components/image-upload";
import { supabaseUrl } from "@/lib/supabase/config";
import { logError, safeMessage } from "@/lib/errors";
import type { WorkerProfile } from "@/types/domain";

const MAX_IMAGES = 6;

type PortfolioItem = { id: number; image_path: string; sort: number };

export function BrziProfilPremium({ worker, userId }: { worker: WorkerProfile; userId: string }) {
  const [items, setItems] = useState<PortfolioItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<{ text: string; type: "info" | "error" | "success" } | null>(null);
  const [requesting, setRequesting] = useState(false);

  useEffect(() => {
    async function load() {
      const supabase = createBrowserSupabase();
      const { data } = await supabase
        .from("worker_portfolio")
        .select("id,image_path,sort")
        .eq("worker_id", worker.id)
        .order("sort");
      setItems((data ?? []) as PortfolioItem[]);
      setLoading(false);
    }
    load();
  }, [worker.id]);

  async function addImage(path: string) {
    if (!path) return;
    if (items.length >= MAX_IMAGES) {
      setNotice({ text: `Maksimalno ${MAX_IMAGES} slika.`, type: "error" });
      return;
    }
    const supabase = createBrowserSupabase();
    const { data, error } = await supabase
      .from("worker_portfolio")
      .insert({ worker_id: worker.id, image_path: path, sort: items.length })
      .select("id,image_path,sort")
      .single();
    if (error) { logError("Premium.addImage", error); setNotice({ text: safeMessage(error, "save"), type: "error" }); return; }
    setItems(prev => [...prev, data as PortfolioItem]);
  }

  async function removeImage(id: number) {
    const supabase = createBrowserSupabase();
    const { error } = await supabase.from("worker_portfolio").delete().eq("id", id);
    if (!error) setItems(prev => prev.filter(i => i.id !== id));
  }

  async function requestPremium(plan: string) {
    setRequesting(true);
    const supabase = createBrowserSupabase();
    const { error } = await supabase.from("premium_requests").insert({
      worker_id: worker.id, user_id: userId, plan, status: "pending",
    });
    if (error) {
      logError("Premium.request", error);
      setNotice({ text: safeMessage(error, "submit"), type: "error" });
    } else {
      setNotice({ text: "Zahtjev za premium je poslat. Admin će aktivirati profil nakon uplate.", type: "success" });
    }
    setRequesting(false);
  }

  // Non-premium worker — show request CTA
  if (!worker.is_premium) {
    return (
      <div className="form-card" style={{ marginTop: 16 }}>
        <div className="kicker" style={{ marginBottom: 6 }}>★ Premium profil</div>
        <p style={{ fontSize: 14, color: "var(--muted)", marginBottom: 12, lineHeight: 1.6 }}>
          Premium brzi profil ti daje <strong style={{ color: "var(--ink)" }}>posebnu javnu stranicu</strong> na imaposla.me,
          galeriju radova i bolju vidljivost u listi.
          {worker.slug && (
            <> Javni link: <code style={{ fontSize: 13 }}>/radnici/{worker.slug}</code></>
          )}
          <br />
          <strong style={{ color: "var(--ink)" }}>Premium aktivira admin nakon uplate.</strong>
        </p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button className="btn blue sm" disabled={requesting} onClick={() => requestPremium("7d")}>Zatraži — 5€ / 7 dana</button>
          <button className="btn blue sm" disabled={requesting} onClick={() => requestPremium("30d")}>Zatraži — 15€ / mjesec</button>
          <button className="btn blue sm" disabled={requesting} onClick={() => requestPremium("season")}>Zatraži — 30€ / sezona</button>
        </div>
        {notice && <p className={`notice ${notice.type}`} style={{ marginTop: 12 }}>{notice.text}</p>}
      </div>
    );
  }

  // Premium worker — portfolio gallery management
  return (
    <div className="form-card" style={{ marginTop: 16 }}>
      <div className="kicker" style={{ marginBottom: 6 }}>★ Galerija radova (Premium)</div>
      {worker.slug && (
        <p style={{ fontSize: 13, marginBottom: 10 }}>
          Tvoja javna stranica:{" "}
          <Link href={`/radnici/${worker.slug}`} style={{ color: "var(--brand-red)", fontWeight: 700 }}>
            Pogledaj javnu stranicu →
          </Link>
        </p>
      )}
      <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: 12 }}>
        Dodaj do {MAX_IMAGES} slika svojih radova. ({items.length}/{MAX_IMAGES})
      </p>

      {!loading && items.length > 0 && (
        <div className="bp-portfolio-grid" style={{ marginBottom: 14 }}>
          {items.map(img => (
            <div key={img.id} className="bp-portfolio-img" style={{ position: "relative" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`${supabaseUrl}/storage/v1/object/public/worker-photos/${img.image_path}`} alt="Rad" loading="lazy" />
              <button
                type="button"
                onClick={() => removeImage(img.id)}
                aria-label="Ukloni sliku"
                style={{
                  position: "absolute", top: 4, right: 4, width: 26, height: 26,
                  borderRadius: "50%", border: "none", background: "rgba(0,0,0,.6)",
                  color: "#fff", cursor: "pointer", fontSize: 14,
                }}
              >×</button>
            </div>
          ))}
        </div>
      )}

      {items.length < MAX_IMAGES && (
        <ImageUpload
          bucket="worker-photos"
          ownerUserId={userId}
          currentPath={null}
          fallbackText="Dodaj sliku"
          shape="rounded"
          size={88}
          onUploaded={addImage}
        />
      )}
      {notice && <p className={`notice ${notice.type}`} style={{ marginTop: 12 }}>{notice.text}</p>}
    </div>
  );
}
