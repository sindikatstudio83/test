"use client";

import { useRouter } from "next/navigation";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { createBrowserSupabase } from "@/lib/supabase/client";
import { safeMessage, logError } from "@/lib/errors";
import { ImageUpload } from "@/components/image-upload";
import { supabaseUrl } from "@/lib/supabase/config";
import { placementLabels, formatLabels, audienceLabels, deviceLabels } from "@/lib/banner-constants";
import type { Banner, BannerPlacement, BannerFormat, BannerAudience, BannerDevice } from "@/types/domain";

type FormState = {
  id: number | null;
  title: string;
  image_path: string;
  target_url: string;
  placement: BannerPlacement;
  format: BannerFormat | "";
  target_audience: BannerAudience;
  device: BannerDevice;
  approved: boolean;
  priority: number;
  start_date: string;
  end_date: string;
};

const emptyForm: FormState = {
  id: null,
  title: "",
  image_path: "",
  target_url: "",
  placement: "homepage_top",
  format: "billboard_970x250",
  target_audience: "all",
  device: "all",
  approved: true,
  priority: 0,
  start_date: "",
  end_date: ""
};

export function AdminBannersClient() {
  const router = useRouter();
  const { role, ready, userId } = useAuth();
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<{ type: "info" | "error" | "success"; text: string } | null>(null);

  useEffect(() => {
    if (!ready) return;
    if (role !== "admin") {
      router.replace("/");
      return;
    }
    load();
  }, [ready, role, router]);

  async function load() {
    setLoading(true);
    const supabase = createBrowserSupabase();
    const { data, error } = await supabase
      .from("banners")
      .select("*")
      .order("placement")
      .order("priority", { ascending: false });
    if (error) {
      logError("AdminBanners.load", error);
      setNotice({ type: "error", text: safeMessage(error, "load") });
    } else {
      setBanners((data || []) as Banner[]);
    }
    setLoading(false);
  }

  function startCreate() {
    setForm(emptyForm);
    setEditing(true);
    setNotice(null);
  }

  function startEdit(banner: Banner) {
    setForm({
      id: banner.id,
      title: banner.title,
      image_path: banner.image_path || "",
      target_url: banner.target_url || "",
      placement: banner.placement as BannerPlacement,
      format: (banner.format as BannerFormat) || "",
      target_audience: banner.target_audience,
      device: banner.device,
      approved: banner.approved,
      priority: banner.priority,
      start_date: banner.start_date ? banner.start_date.slice(0, 16) : "",
      end_date: banner.end_date ? banner.end_date.slice(0, 16) : ""
    });
    setEditing(true);
    setNotice(null);
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function save() {
    if (!form.title || !form.image_path) {
      setNotice({ type: "error", text: "Naziv i slika su obavezni." });
      return;
    }
    setSaving(true);

    const payload = {
      title: form.title,
      image_path: form.image_path || null,
      target_url: form.target_url || null,
      placement: form.placement,
      format: form.format || null,
      target_audience: form.target_audience,
      device: form.device,
      approved: form.approved,
      priority: form.priority,
      start_date: form.start_date ? new Date(form.start_date).toISOString() : null,
      end_date: form.end_date ? new Date(form.end_date).toISOString() : null
    };

    const supabase = createBrowserSupabase();
    const result = form.id
      ? await supabase.from("banners").update(payload).eq("id", form.id)
      : await supabase.from("banners").insert(payload);

    if (result.error) {
      logError("AdminBanners.save", result.error);
      setNotice({ type: "error", text: safeMessage(result.error, "save") });
    } else {
      setNotice({ type: "success", text: "Banner sačuvan." });
      setEditing(false);
      setForm(emptyForm);
      load();
    }
    setSaving(false);
  }

  async function remove(id: number) {
    if (!confirm("Obrisati banner?")) return;
    const supabase = createBrowserSupabase();
    const { error } = await supabase.from("banners").delete().eq("id", id);
    if (error) {
      logError("AdminBanners.remove", error);
      setNotice({ type: "error", text: safeMessage(error, "delete") });
    } else {
      setNotice({ type: "success", text: "Banner obrisan." });
      load();
    }
  }

  async function toggleActive(banner: Banner) {
    const supabase = createBrowserSupabase();
    const { error } = await supabase
      .from("banners")
      .update({ approved: !banner.approved })
      .eq("id", banner.id);
    if (error) {
      logError("AdminBanners.toggle", error);
      setNotice({ type: "error", text: safeMessage(error, "save") });
    } else {
      load();
    }
  }

  function getImageUrl(path: string) {
    if (!path) return "";
    if (path.startsWith("http")) return path;
    return `${supabaseUrl}/storage/v1/object/public/banners/${path}`;
  }

  if (!ready || loading) {
    return <div className="panel"><p>Učitavanje...</p></div>;
  }

  return (
    <section>
      <div className="section-head">
        <div>
          <span className="page-label">Admin</span>
          <h1>Reklamni baneri</h1>
          <p className="sub">{banners.length} {banners.length === 1 ? "banner" : "banera"} ukupno</p>
        </div>
        {!editing && (
          <button className="btn blue" onClick={startCreate} type="button">+ Novi banner</button>
        )}
      </div>

      {notice && (
        <p className={`notice ${notice.type}`} role={notice.type === "error" ? "alert" : "status"} style={{ marginBottom: 14 }}>
          {notice.text}
        </p>
      )}

      {editing && userId && (
        <div className="form-card" style={{ marginBottom: 24 }}>
          <h2 style={{ marginTop: 0 }}>{form.id ? "Uredi banner" : "Novi banner"}</h2>

          <label>
            <span className="label">Slika banera *</span>
            <ImageUpload
              bucket="banners"
              ownerUserId={userId}
              currentPath={form.image_path}
              fallbackText={form.title || "Banner"}
              shape="rounded"
              size={120}
              onUploaded={async (newPath) => {
                // Premjesti iz company-logos u banners bucket
                // Jednostavnije: zadrži path ali u banners bucketu — koristi ImageUpload sa dinamičkim bucketom
                setForm({ ...form, image_path: newPath });
              }}
            />
            <p className="hint">Preporuka: format koji odgovara izabranoj veličini ispod.</p>
          </label>

          <label>
            <span className="label">Naziv (interni) *</span>
            <input
              className="field"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="npr. Banka — proljeće 2026"
              required
            />
          </label>

          <label>
            <span className="label">Destinacija (URL)</span>
            <input
              className="field"
              type="url"
              value={form.target_url}
              onChange={(e) => setForm({ ...form, target_url: e.target.value })}
              placeholder="https://..."
            />
          </label>

          <div className="form-grid">
            <label>
              <span className="label">Pozicija *</span>
              <select className="field" value={form.placement} onChange={(e) => setForm({ ...form, placement: e.target.value as BannerPlacement })}>
                {Object.entries(placementLabels).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </label>

            <label>
              <span className="label">Format</span>
              <select className="field" value={form.format} onChange={(e) => setForm({ ...form, format: e.target.value as BannerFormat })}>
                <option value="">Bez formata</option>
                {Object.entries(formatLabels).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </label>
          </div>

          <div className="form-grid">
            <label>
              <span className="label">Publika</span>
              <select className="field" value={form.target_audience} onChange={(e) => setForm({ ...form, target_audience: e.target.value as BannerAudience })}>
                {Object.entries(audienceLabels).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
              </select>
            </label>

            <label>
              <span className="label">Uređaj</span>
              <select className="field" value={form.device} onChange={(e) => setForm({ ...form, device: e.target.value as BannerDevice })}>
                {Object.entries(deviceLabels).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
              </select>
            </label>
          </div>

          <div className="form-grid">
            <label>
              <span className="label">Prioritet (veći = ranije)</span>
              <input className="field" type="number" value={form.priority} onChange={(e) => setForm({ ...form, priority: Number(e.target.value) || 0 })} />
            </label>

            <label style={{ alignSelf: "end" }}>
              <span className="label">&nbsp;</span>
              <span style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", border: "1.5px solid var(--line2)", borderRadius: 12 }}>
                <input
                  type="checkbox"
                  checked={form.approved}
                  onChange={(e) => setForm({ ...form, approved: e.target.checked })}
                />
                <strong>Aktivan</strong>
              </span>
            </label>
          </div>

          <div className="form-grid">
            <label>
              <span className="label">Početak prikazivanja (opciono)</span>
              <input className="field" type="datetime-local" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
            </label>

            <label>
              <span className="label">Kraj prikazivanja (opciono)</span>
              <input className="field" type="datetime-local" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} />
            </label>
          </div>

          {form.image_path && (
            <div style={{ marginTop: 8 }}>
              <span className="label">Pregled</span>
              <div className="ad-banner" style={{ margin: "8px 0" }}>
                <span className="ad-label">Sponzorisano</span>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={getImageUrl(form.image_path)} alt={form.title} className="ad-banner-img" />
              </div>
            </div>
          )}

          <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
            <button className="btn blue" onClick={save} disabled={saving} type="button">
              {saving ? "Čuvanje..." : (form.id ? "Sačuvaj izmjene" : "Kreiraj banner")}
            </button>
            <button className="btn ghost" onClick={() => { setEditing(false); setForm(emptyForm); }} type="button">
              Odustani
            </button>
          </div>
        </div>
      )}

      {!editing && (
        banners.length === 0 ? (
          <div className="empty">
            <strong>Nema kreiranih banera</strong>
            <p>Klikni „Novi banner“ da dodaš prvi.</p>
            <div className="actions">
              <button className="btn blue sm" onClick={startCreate} type="button">+ Novi banner</button>
            </div>
          </div>
        ) : (
          <div className="table-card">
            {banners.map(b => (
              <div className="banner-row" key={b.id}>
                <div className="banner-thumb">
                  {b.image_path ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={getImageUrl(b.image_path)} alt="" />
                  ) : <span>?</span>}
                </div>
                <div className="banner-info">
                  <strong>{b.title}</strong>
                  <small>
                    {placementLabels[b.placement as BannerPlacement] || b.placement}
                    {b.format ? ` · ${formatLabels[b.format as BannerFormat] || b.format}` : ""}
                  </small>
                  <div className="banner-tags">
                    <span className="tag">{audienceLabels[b.target_audience]}</span>
                    <span className="tag">{deviceLabels[b.device]}</span>
                    <span className="tag">prioritet {b.priority}</span>
                    <span className="tag">{b.impressions} impr.</span>
                    <span className="tag">{b.clicks} klikova</span>
                  </div>
                </div>
                <div className="banner-actions">
                  <span className={`status-badge ${b.approved ? "stage-hired" : "stage-rejected"}`}>
                    {b.approved ? "Aktivan" : "Pauziran"}
                  </span>
                  <button className="btn ghost sm" onClick={() => toggleActive(b)} type="button">
                    {b.approved ? "Pauziraj" : "Aktiviraj"}
                  </button>
                  <button className="btn ghost sm" onClick={() => startEdit(b)} type="button">Uredi</button>
                  <button className="btn red sm" onClick={() => remove(b.id)} type="button">Obriši</button>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      <div style={{ marginTop: 30 }}>
        <Link className="btn ghost sm" href="/admin">← Nazad na admin</Link>
      </div>
    </section>
  );
}
