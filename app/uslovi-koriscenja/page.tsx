import type { Metadata } from "next";
import { PageLabel } from "@/components/ui";

export const metadata: Metadata = {
  title: "Uslovi korišćenja",
  description: "Uslovi korišćenja platforme imaposla.me."
};

export default function TermsPage() {
  return (
    <section className="live-info-page" style={{ maxWidth: 780 }}>
      <PageLabel>Pravno</PageLabel>
      <h1>Uslovi korišćenja</h1>
      <p className="lead">Platforma imaposla.me služi za objavu i pretragu oglasa za posao u Crnoj Gori. Korišćenjem platforme prihvataš ove uslove.</p>

      <div className="panel" style={{ marginTop: 24 }}>
        <h2 style={{ fontSize: 22, marginBottom: 12 }}>Nalog i odgovornost</h2>
        <p style={{ color: "var(--muted)", lineHeight: 1.75, marginBottom: 12 }}>
          Korisnik je odgovoran za tačnost podataka koje unosi u profil, oglas, biografiju ili prijavu. Nije dozvoljeno lažno predstavljanje, uvredljiv, diskriminatoran ili nezakonit sadržaj.
        </p>
        <p style={{ color: "var(--muted)", lineHeight: 1.75 }}>
          Zabranjena je upotreba jednog naloga od strane više osoba, kao i kreiranje duplih naloga. Platforma zadržava pravo da obustavi nalog u slučaju zloupotrebe.
        </p>
      </div>

      <div className="panel" style={{ marginTop: 16 }}>
        <h2 style={{ fontSize: 22, marginBottom: 12 }}>Provjera sadržaja</h2>
        <p style={{ color: "var(--muted)", lineHeight: 1.75 }}>
          Profili firmi i oglasi za posao mogu čekati administratorsku provjeru prije javnog prikaza. Platforma ne garantuje prikaz sadržaja koji krši ove uslove ili koji je nepogodan za platformu.
        </p>
      </div>

      <div className="panel" style={{ marginTop: 16 }}>
        <h2 style={{ fontSize: 22, marginBottom: 12 }}>Planovi i plaćanje</h2>
        <p style={{ color: "var(--muted)", lineHeight: 1.75, marginBottom: 12 }}>
          Aktivacija plana vrši se nakon provjere bankovnog transfera. Dokaz uplate se koristi isključivo za potvrdu narudžbe.
        </p>
        <p style={{ color: "var(--muted)", lineHeight: 1.75 }}>
          U slučaju greške u uplati, korisnik kontaktira platformu radi korekcije. Platforma ne vrši automatske povrate sredstava — svaki slučaj se rješava individualno.
        </p>
      </div>

      <div className="panel" style={{ marginTop: 16 }}>
        <h2 style={{ fontSize: 22, marginBottom: 12 }}>Ograničenje odgovornosti</h2>
        <p style={{ color: "var(--muted)", lineHeight: 1.75 }}>
          Platforma je posrednik između kandidata i poslodavaca i ne garantuje zaposlenje niti uspješnost selekcije. Platforma nije odgovorna za sadržaj koji su unijeli korisnici, niti za ishod procesa zapošljavanja.
        </p>
      </div>

      <div className="panel" style={{ marginTop: 16 }}>
        <h2 style={{ fontSize: 22, marginBottom: 12 }}>Izmjene uslova</h2>
        <p style={{ color: "var(--muted)", lineHeight: 1.75 }}>
          Platforma zadržava pravo izmjene ovih uslova uz najavu korisnicima. Nastavak korišćenja platforme po izmjeni uslova podrazumijeva prihvatanje novih uslova.
        </p>
      </div>
    </section>
  );
}

