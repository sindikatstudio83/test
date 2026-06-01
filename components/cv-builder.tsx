"use client";

import { useRouter } from "next/navigation";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { createBrowserSupabase } from "@/lib/supabase/client";
import { safeMessage, logError } from "@/lib/errors";
import { ImageUpload } from "@/components/image-upload";
import type { CvData } from "@/types/domain";

const emptyCv: CvData = {
  fullName: "", title: "", city: "", phone: "", email: "",
  summary: "", skills: "", languages: "", experience: "",
  education: "", certificates: "", availability: ""
};

type SaveStatus = "idle" | "saving" | "saved" | "error";

export function CvBuilder() {
  const router = useRouter();
  const { userId, email, ready, role } = useAuth();
  const [cv, setCv] = useState<CvData>(emptyCv);
  const [avatarPath, setAvatarPath] = useState<string | null>(null);
  const [loadStatus, setLoadStatus] = useState("Učitavanje biografije...");
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [saveMessage, setSaveMessage] = useState("");
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!ready) return;

    if (!userId || role === "guest") {
      router.replace("/login?next=/profil/biografija");
      return;
    }

    const supabase = createBrowserSupabase();

    async function load() {
      const { data, error } = await supabase
        .from("profiles")
        .select("cv_data,full_name,phone,city,email,avatar_path")
        .eq("id", userId!)
        .maybeSingle();

      if (error) {
        logError("CvBuilder.load", error);
        setLoadStatus("Učitavanje nije uspjelo. Osvježi stranicu.");
        return;
      }

      const remote = data;
      setCv({
        ...emptyCv,
        ...(remote?.cv_data || {}),
        fullName: remote?.cv_data?.fullName || remote?.full_name || "",
        phone: remote?.cv_data?.phone || remote?.phone || "",
        city: remote?.cv_data?.city || remote?.city || "",
        email: remote?.cv_data?.email || remote?.email || email || ""
      });
      setAvatarPath(remote?.avatar_path || null);
      setLoadStatus("Promjene se automatski čuvaju.");
    }
    load();

    return () => {
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    };
  }, [ready, userId, email, role, router]);

  const skills = useMemo(
    () => (cv.skills || "").split(",").map((s) => s.trim()).filter(Boolean),
    [cv.skills]
  );

  function update(name: keyof CvData, value: string) {
    setCv((current) => ({ ...current, [name]: value.slice(0, 6000) }));
    setSaveStatus("idle");
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => save(), 1500);
  }

  async function save() {
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    if (!userId) {
      setSaveStatus("error");
      setSaveMessage("Sesija je istekla. Prijavi se ponovo.");
      return;
    }

    setSaveStatus("saving");
    const supabase = createBrowserSupabase();
    const { error } = await supabase
      .from("profiles")
      .update({
        cv_data: cv,
        full_name: cv.fullName || null,
        phone: cv.phone || null,
        city: cv.city || null,
        cv_updated_at: new Date().toISOString()
      })
      .eq("id", userId);

    if (error) {
      logError("CvBuilder.save", error);
      setSaveStatus("error");
      setSaveMessage(safeMessage(error, "save"));
    } else {
      setSaveStatus("saved");
      setSaveMessage("");
    }
  }

  function printCv() { window.print(); }

  async function updateAvatar(newPath: string) {
    if (!userId) return;
    const supabase = createBrowserSupabase();
    const { error } = await supabase
      .from("profiles")
      .update({ avatar_path: newPath || null })
      .eq("id", userId);
    if (error) {
      logError("CvBuilder.updateAvatar", error);
      throw error;
    }
    setAvatarPath(newPath || null);
  }


  const field = (name: keyof CvData, label: string, placeholder: string, textarea = false) => (
    <label key={name}>
      <span className="label">{label}</span>
      {textarea
        ? <textarea className="textarea" value={cv[name] || ""} placeholder={placeholder} onChange={(e) => update(name, e.target.value)} />
        : <input className="field" value={cv[name] || ""} placeholder={placeholder} onChange={(e) => update(name, e.target.value)} />
      }
    </label>
  );

  const saveLabel = saveStatus === "saving" ? "Čuvanje..." : saveStatus === "saved" ? "Sačuvano ✓" : "Sačuvaj";

  if (!ready) {
    return <div className="panel loading-panel"><p>Učitavanje...</p></div>;
  }

  // Računanje popunjenosti
  const filledFields = ["fullName", "title", "city", "phone", "email", "summary", "skills", "experience", "education"]
    .filter(f => Boolean((cv as Record<string, string | undefined>)[f])).length;
  const totalFields = 9;
  const percent = Math.round((filledFields / totalFields) * 100);

  return (
    <section className="cv-builder-page">
      <div className="cv-builder-head">
        <div>
          <span className="page-label">Biografija</span>
          <h1>Napravi biografiju bez slanja fajlova.</h1>
          <p>Popuni podatke jednom — koristiš ih za sve prijave. Klikni &quot;Preuzmi PDF&quot; ili pritisni Ctrl+P / ⌘P i odaberi &quot;Spremi kao PDF&quot;.</p>
          <p className="hint" style={{ marginTop: 10 }}>{loadStatus}</p>
        </div>
        <div className="cv-head-actions">
          <Link className="btn ghost" href="/profil">← Nazad</Link>
          <button className="btn ghost" onClick={printCv} type="button" title="Koristi Ctrl+P ili Cmd+P → Spremi kao PDF">
            ⬇ Preuzmi PDF
          </button>
          <button className="btn blue" onClick={save} type="button" disabled={saveStatus === "saving"}>
            {saveLabel}
          </button>
        </div>
      </div>

      <div className="form-card" style={{ marginBottom: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
          <strong>Popunjeno {percent}% — {filledFields} od {totalFields} polja</strong>
          {percent < 60 && <span className="badge orange">Dopuni za prijave</span>}
          {percent >= 60 && percent < 100 && <span className="badge blue">Možeš slati prijave</span>}
          {percent === 100 && <span className="badge green">Kompletno</span>}
        </div>
        <div className="pbar" style={{ height: 8, background: "var(--line)", borderRadius: 999, overflow: "hidden" }}>
          <div style={{ height: "100%", background: percent < 60 ? "var(--orange)" : percent < 100 ? "var(--blue)" : "var(--green)", width: `${percent}%`, transition: "width .3s" }} />
        </div>
      </div>

      {saveStatus === "error" && saveMessage && <p className="notice error" role="alert">{saveMessage}</p>}

      <div className="cv-builder-grid">
        <form className="cv-builder-form" onSubmit={(e) => { e.preventDefault(); save(); }}>
          {userId && (
            <div className="form-card" style={{ marginBottom: 14 }}>
              <span className="label">Profilna slika</span>
              <ImageUpload
                bucket="avatars"
                ownerUserId={userId}
                currentPath={avatarPath}
                fallbackText={cv.fullName || email || "?"}
                shape="circle"
                size={88}
                onUploaded={updateAvatar}
              />
            </div>
          )}
          <div className="form-grid">
            {field("fullName", "Ime i prezime *", "npr. Marko Marković")}
            {field("title", "Zanimanje", "npr. Konobar, recepcioner")}
          </div>
          <div className="form-grid">
            {field("city", "Grad", "npr. Podgorica")}
            {field("phone", "Telefon", "+382 ...")}
          </div>
          {field("email", "E-pošta", "ime@email.com")}
          {field("summary", "Kratak opis", "Ko si, šta znaš i kakav posao tražiš.", true)}
          {field("skills", "Vještine", "Odvoji zarezom: rad sa gostima, engleski, kasa...", true)}
          {field("experience", "Radno iskustvo", "Firma, pozicija, period i odgovornosti.", true)}
          {field("education", "Obrazovanje", "Škola, kurs, fakultet ili praktična obuka.", true)}
          {field("languages", "Jezici", "npr. crnogorski C2, engleski B2...", true)}
          {field("certificates", "Sertifikati i obuke", "Kursevi, licence, obuke.", true)}
          {field("availability", "Dostupnost", "Od kada možeš početi, smjene, sezona...", true)}
          <button className="btn lime" type="submit" disabled={saveStatus === "saving"}>{saveLabel}</button>
        </form>

        <article className="cv-preview" aria-label="Pregled biografije">
          <header>
            <div>
              <span>Biografija</span>
              <h2>{cv.fullName || "Ime i prezime"}</h2>
              <p>{cv.title || "Pozicija / zanimanje"}</p>
            </div>
            <aside>
              {cv.city || "Grad"}<br />
              {cv.phone || "Telefon"}<br />
              {cv.email || "E-pošta"}
            </aside>
          </header>
          {cv.summary ? <section><h3>Kratak opis</h3><p>{cv.summary}</p></section> : null}
          {skills.length ? <section><h3>Vještine</h3><div className="cv-skill-list">{skills.map((s) => <span key={s}>{s}</span>)}</div></section> : null}
          {cv.experience ? <section><h3>Iskustvo</h3><p>{cv.experience}</p></section> : null}
          {cv.education ? <section><h3>Obrazovanje</h3><p>{cv.education}</p></section> : null}
          {cv.languages ? <section><h3>Jezici</h3><p>{cv.languages}</p></section> : null}
          {cv.certificates ? <section><h3>Sertifikati</h3><p>{cv.certificates}</p></section> : null}
          {cv.availability ? <section><h3>Dostupnost</h3><p>{cv.availability}</p></section> : null}
        </article>
      </div>
    </section>
  );
}
