"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { createBrowserSupabase } from "@/lib/supabase/client";
import { safeMessage, logError } from "@/lib/errors";
import type { PublicWorkerProfile, WorkerContactInfo } from "@/types/domain";

type ContactState = "ready" | "sending" | "sent" | "error";

const MESSAGE_MAX = 500;

export function WorkerContact({ worker }: { worker: PublicWorkerProfile }) {
  const { userId, ready } = useAuth();
  const [state, setState] = useState<ContactState>("ready");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [contact, setContact] = useState<WorkerContactInfo | null>(null);

  // Is the viewer the worker themselves? (cannot contact self)
  const isSelf = !!userId && userId === worker.user_id;

  // Securely fetch contact info ONLY for logged-in users via RPC.
  // The RPC returns phone/viber only if worker.show_phone (or owner/admin).
  useEffect(() => {
    if (!ready || !userId || isSelf) return;
    let active = true;
    (async () => {
      try {
        const supabase = createBrowserSupabase();
        const { data, error: rpcErr } = await supabase.rpc("get_worker_contact", { p_worker_id: worker.id });
        if (rpcErr) { logError("WorkerContact.getContact", rpcErr); return; }
        const row = Array.isArray(data) ? data[0] : data;
        if (active && row) setContact(row as WorkerContactInfo);
      } catch (err) {
        logError("WorkerContact.getContact", err as { message?: string });
      }
    })();
    return () => { active = false; };
  }, [ready, userId, isSelf, worker.id]);

  async function sendMessage(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!userId) return;
    if (isSelf) { setError("Ne možeš kontaktirati sam sebe."); setState("error"); return; }

    setState("sending");
    setError("");

    const fd = new FormData(e.currentTarget);
    const msg = String(fd.get("message") || "").trim().slice(0, MESSAGE_MAX);
    const fromName = String(fd.get("from_name") || "").trim();
    const fromContact = String(fd.get("from_contact") || "").trim();

    if (!msg) { setError("Upiši poruku."); setState("error"); return; }

    try {
      const supabase = createBrowserSupabase();
      const { error: insErr } = await supabase.from("worker_messages").insert({
        worker_id: worker.id,
        from_user: userId,
        from_name: fromName || null,
        from_contact: fromContact || null,
        message: msg,
      });
      if (insErr) {
        logError("WorkerContact.send", insErr);
        setError(safeMessage(insErr, "submit"));
        setState("error");
        return;
      }
      setState("sent");
    } catch (err) {
      logError("WorkerContact.send", err as { message?: string });
      setError("Greška pri slanju poruke.");
      setState("error");
    }
  }

  if (!ready) return <p className="notice">Učitavanje...</p>;

  // Guest — locked CTA, no contact data exposed
  if (!userId) {
    return (
      <div className="bp-contact-locked">
        <p style={{ marginBottom: 8 }}><strong>Prijavi se da pošalješ upit ovom radniku.</strong></p>
        <p style={{ marginBottom: 6 }}>Radnik će dobiti tvoju poruku i kontakt koji ostaviš.</p>
        <p style={{ marginBottom: 16, fontSize: 12, color: "var(--muted)" }}>Nalog tražimo da zaštitimo radnike od spama. Besplatno je i traje minut.</p>
        <div className="actions" style={{ justifyContent: "center", gap: 8 }}>
          <Link className="btn blue sm" href={`/login?next=/brzi-poslovi/radnici/${worker.id}`}>Prijava</Link>
          <Link className="btn ghost sm" href="/registracija">Registracija</Link>
        </div>
      </div>
    );
  }

  // Self — cannot contact own profile
  if (isSelf) {
    return (
      <div className="bp-contact-locked">
        <p><strong>Ovo je tvoj profil.</strong></p>
        <p style={{ marginTop: 6 }}>
          <Link className="btn ghost sm" href="/profil/brzi-profil">Uredi moju ponudu usluga →</Link>
        </p>
      </div>
    );
  }

  if (state === "sent") {
    return (
      <div className="bp-contact-box">
        <p style={{ textAlign: "center", fontWeight: 700, color: "var(--green)" }}>✓ Poruka je poslata!</p>
        <p style={{ textAlign: "center", color: "var(--muted)", fontSize: 13, marginTop: 6 }}>
          Radnik je dobio tvoju poruku i obavještenje. Javiće ti se na kontakt koji si ostavio.
        </p>
      </div>
    );
  }

  return (
    <div className="bp-contact-box">
      {/* Contact info from secure RPC — phone/viber only if worker opted in */}
      {contact && (contact.contact_phone || contact.contact_viber || contact.contact_email) && (
        <div style={{ marginBottom: 14 }}>
          {contact.contact_phone && (
            <div className="bp-contact-row">
              <span aria-hidden>📞</span><a href={`tel:${contact.contact_phone}`}>{contact.contact_phone}</a>
            </div>
          )}
          {contact.contact_viber && (
            <div className="bp-contact-row">
              <span aria-hidden>💬</span>
              <a href={`viber://chat?number=${encodeURIComponent(contact.contact_viber)}`}>Viber: {contact.contact_viber}</a>
            </div>
          )}
          {contact.contact_email && (
            <div className="bp-contact-row">
              <span aria-hidden>✉️</span><a href={`mailto:${contact.contact_email}`}>{contact.contact_email}</a>
            </div>
          )}
        </div>
      )}

      <form onSubmit={sendMessage}>
        <p style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>Pošalji upit</p>
        <label style={{ display: "block", marginBottom: 8 }}>
          <span className="label">Tvoje ime</span>
          <input className="field" name="from_name" placeholder="Ime i prezime / firma" maxLength={120} />
        </label>
        <label style={{ display: "block", marginBottom: 8 }}>
          <span className="label">Telefon ili email za odgovor</span>
          <input className="field" name="from_contact" placeholder="Telefon ili email" maxLength={120} />
        </label>
        <label style={{ display: "block", marginBottom: 6 }}>
          <span className="label">Poruka *</span>
          <textarea
            className="textarea" name="message" rows={3}
            placeholder="Opiši posao, lokaciju i kada ti treba radnik."
            maxLength={MESSAGE_MAX}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            required
          />
          <span style={{ fontSize: 11, color: "var(--muted)" }}>{message.length}/{MESSAGE_MAX}</span>
        </label>
        {error && <p className="notice error" style={{ marginBottom: 10 }}>{error}</p>}
        <button className="btn blue" type="submit" disabled={state === "sending"} style={{ width: "100%", justifyContent: "center" }}>
          {state === "sending" ? "Slanje..." : "Pošalji upit →"}
        </button>
      </form>
    </div>
  );
}
