"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { createBrowserSupabase } from "@/lib/supabase/client";
import { safeMessage, logError } from "@/lib/errors";
import { ImageUpload } from "@/components/image-upload";
import { slugify } from "@/lib/format";
import { availabilityLabels, workerStatusLabels } from "@/lib/labels";
import { BrziProfilPremium } from "@/components/brzi-profil-premium";
import type { WorkerProfile, Profession, AvailabilityType } from "@/types/domain";

const BIO_MAX = 300;

export function BrziProfilClient() {
  const { userId, ready, role } = useAuth();
  const router = useRouter();

  const [profile, setProfile] = useState<WorkerProfile | null>(null);
  const [professions, setProfessions] = useState<Profession[]>([]);
  const [photoPath, setPhotoPath] = useState<string | null>(null);
  const [cities, setCities] = useState("");
  const [bio, setBio] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<{ text: string; type: "info" | "error" | "success" } | null>(null);

  useEffect(() => {
    if (!ready) return;
    if (!userId || role === "guest") {
      router.replace("/login?next=/profil/brzi-profil");
      return;
    }

    async function load() {
      const supabase = createBrowserSupabase();
      const [profRes, workerRes] = await Promise.all([
        supabase.from("professions").select("id,name,slug,icon,sort,active").eq("active", true).order("sort"),
        supabase.from("worker_profiles").select("*,professions(id,name,slug,icon)").eq("user_id", userId!).maybeSingle(),
      ]);
      setProfessions((profRes.data || []) as Profession[]);
      const w = workerRes.data as WorkerProfile | null;
      if (w) {
        setProfile(w);
        setPhotoPath(w.photo_path);
        setCities(w.cities.join(", "));
        setBio(w.bio || "");
      }
      setLoading(false);
    }
    load();
  }, [ready, userId, role, router]);

  function setMsg(text: string, type: "info" | "error" | "success" = "info") {
    setNotice({ text, type });
  }

  async function updatePhoto(newPath: string) {
    setPhotoPath(newPath || null);
    if (profile?.id) {
      const supabase = createBrowserSupabase();
      await supabase.from("worker_profiles").update({ photo_path: newPath || null }).eq("id", profile.id);
    }
  }

  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!userId) return;
    setSaving(true);
    setNotice(null);

    const fd = new FormData(e.currentTarget);
    const displayName = String(fd.get("display_name") || "").trim();
    const professionId = Number(fd.get("profession_id")) || null;
    const availability = String(fd.get("availability") || "by_agreement") as AvailabilityType;
    const availableFrom = String(fd.get("available_from") || "").trim() || null;
    const experienceYears = Number(fd.get("experience_years")) || 0;
    const priceText = String(fd.get("price_text") || "").trim() || null;
    const languages = String(fd.get("languages") || "").trim() || null;
    const contactPhone = String(fd.get("contact_phone") || "").trim() || null;
    const contactViber = String(fd.get("contact_viber") || "").trim() || null;
    const contactEmail = String(fd.get("contact_email") || "").trim() || null;
    const showPhone = fd.get("show_phone") === "on";
    const isPublic = fd.get("is_public") === "on";

    if (!displayName) { setMsg("Upiši ime ili nadimak.", "error"); setSaving(false); return; }
    if (cities.trim() === "") { setMsg("Upiši bar jedan grad.", "error"); setSaving(false); return; }

    const citiesArr = cities.split(",").map(c => c.trim()).filter(Boolean);
    const professionText = professions.find(p => p.id === professionId)?.name || null;

    const row = {
      user_id: userId,
      display_name: displayName,
      profession_id: professionId,
      profession_text: professionText,
      cities: citiesArr,
      availability,
      available_from: availability === "specific_date" ? availableFrom : null,
      experience_years: experienceYears,
      price_text: priceText,
      languages,
      bio: bio.trim() || null,
      photo_path: photoPath,
      contact_phone: contactPhone,
      contact_viber: contactViber,
      contact_email: contactEmail,
      show_phone: showPhone,
      is_public: isPublic,
    };

    const supabase = createBrowserSupabase();
    const result = profile
      ? await supabase.from("worker_profiles").update(row).eq("id", profile.id)
      : await supabase.from("worker_profiles").insert({
          ...row,
          slug: `${slugify(displayName)}-${slugify(professionText || "radnik")}-${Date.now().toString(36)}`,
        });

    if (result.error) {
      logError("BrziProfil.save", result.error);
      setMsg(safeMessage(result.error, "save"), "error");
    } else {
      setMsg(profile ? "Brzi profil je sačuvan." : "Brzi profil je kreiran i čeka odobrenje admina.", "success");
      // reload to get fresh state
      const { data } = await supabase.from("worker_profiles").select("*,professions(id,name,slug,icon)").eq("user_id", userId).maybeSingle();
      if (data) setProfile(data as WorkerProfile);
    }
    setSaving(false);
  }

  if (!ready || loading) return <div className="empty"><strong>Učitavanje...</strong></div>;

  return (
    <section style={{ maxWidth: 720, margin: "0 auto", padding: "16px 0" }}>
      <div className="section-head">
        <div>
          <span className="page-label">Brzi poslovi</span>
          <h1>Moja ponuda usluga</h1>
          <p className="sub">Kratka ponuda tvojih usluga za brze angažmane.</p>
        </div>
      </div>

      {/* Status banner */}
      {profile && (
        <div className={`notice-card${profile.status === "active" ? "" : " warn"}`} style={{ marginBottom: 16 }}>
          <strong>
            {profile.status === "active" ? "✓ Profil je aktivan i javno vidljiv" : `Status: ${workerStatusLabels[profile.status]}`}
          </strong>
          {profile.status === "pending" && <p>Admin pregleda profil prije nego postane javno vidljiv.</p>}
          {profile.status === "active" && profile.is_premium && <p>★ Premium profil — dostupan na /radnici/{profile.slug}</p>}
        </div>
      )}

      <form className="form-card" onSubmit={save}>
        {profile?.id && userId && (
          <div style={{ marginBottom: 8 }}>
            <span className="label">Fotografija (opciono)</span>
            <ImageUpload
              bucket="worker-photos"
              ownerUserId={userId}
              currentPath={photoPath}
              fallbackText={profile.display_name || "Radnik"}
              shape="rounded"
              size={88}
              onUploaded={updatePhoto}
            />
          </div>
        )}

        <label><span className="label">Ime ili nadimak *</span>
          <input className="field" name="display_name" defaultValue={profile?.display_name || ""} placeholder="npr. Marko P." required />
        </label>

        <div className="form-grid">
          <label><span className="label">Zanimanje *</span>
            <select className="select" name="profession_id" defaultValue={profile?.profession_id || ""} required>
              <option value="">Izaberi zanimanje</option>
              {professions.map(p => (
                <option key={p.id} value={p.id}>{p.icon ? `${p.icon} ` : ""}{p.name}</option>
              ))}
            </select>
          </label>
          <label><span className="label">Iskustvo (godina)</span>
            <input className="field" name="experience_years" type="number" min="0" max="50" defaultValue={profile?.experience_years || 0} />
          </label>
        </div>

        <label><span className="label">Gradovi (odvoji zarezom) *</span>
          <input className="field" value={cities} onChange={e => setCities(e.target.value)} placeholder="npr. Podgorica, Budva" required />
        </label>

        <div className="form-grid">
          <label><span className="label">Dostupnost</span>
            <select className="select" name="availability" defaultValue={profile?.availability || "by_agreement"}>
              {(Object.keys(availabilityLabels) as AvailabilityType[]).map(a => (
                <option key={a} value={a}>{availabilityLabels[a]}</option>
              ))}
            </select>
          </label>
          <label><span className="label">Dostupan od (ako određen datum)</span>
            <input className="field" name="available_from" type="date" defaultValue={profile?.available_from || ""} />
          </label>
        </div>

        <div className="form-grid">
          <label><span className="label">Cijena</span>
            <input className="field" name="price_text" defaultValue={profile?.price_text || ""} placeholder="npr. od 50€/dan ili po dogovoru" />
          </label>
          <label><span className="label">Jezici</span>
            <input className="field" name="languages" defaultValue={profile?.languages || ""} placeholder="npr. crnogorski, engleski" />
          </label>
        </div>

        <label>
          <span className="label">Kratak opis (max {BIO_MAX} znakova)</span>
          <textarea
            className="textarea"
            value={bio}
            onChange={e => setBio(e.target.value.slice(0, BIO_MAX))}
            rows={4}
            placeholder="Opiši šta radiš, kakvo iskustvo imaš, gdje si radio..."
          />
          <span style={{ fontSize: 11, color: "var(--muted)" }}>{bio.length}/{BIO_MAX}</span>
        </label>

        <div className="kicker" style={{ margin: "8px 0 4px" }}>Kontakt</div>
        <div className="form-grid">
          <label><span className="label">Telefon</span>
            <input className="field" name="contact_phone" type="tel" defaultValue={profile?.contact_phone || ""} placeholder="+382 6x xxx xxx" />
          </label>
          <label><span className="label">Viber/WhatsApp</span>
            <input className="field" name="contact_viber" type="tel" defaultValue={profile?.contact_viber || ""} placeholder="+382 6x xxx xxx" />
          </label>
        </div>
        <label><span className="label">Email za kontakt</span>
          <input className="field" name="contact_email" type="email" defaultValue={profile?.contact_email || ""} placeholder="ime@email.com" />
        </label>

        <label className="checkbox-row" style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 8 }}>
          <input type="checkbox" name="show_phone" defaultChecked={profile?.show_phone ?? false} />
          <span>Prikaži telefon prijavljenim korisnicima</span>
        </label>
        <label className="checkbox-row" style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input type="checkbox" name="is_public" defaultChecked={profile?.is_public ?? true} />
          <span>Profil je javno vidljiv</span>
        </label>

        <button className="btn blue" disabled={saving} style={{ marginTop: 12 }}>
          {saving ? "Čuvanje..." : profile ? "Sačuvaj profil" : "Kreiraj brzi profil →"}
        </button>
        {notice && <p className={`notice ${notice.type}`} style={{ marginTop: 12 }}>{notice.text}</p>}
      </form>

      {/* Premium section — portfolio gallery or request CTA */}
      {profile && userId && <BrziProfilPremium worker={profile} userId={userId} />}
    </section>
  );
}
