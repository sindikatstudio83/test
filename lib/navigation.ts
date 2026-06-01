import type { UserRole } from "@/types/domain";

export type NavItem = {
  label: string;
  href: string;
  icon: string;
};

export const desktopNavItems: Record<UserRole, NavItem[]> = {
  guest: [
    { icon: "oglasi",      label: "Tražim posao",  href: "/oglasi" },
    { icon: "brzi",        label: "Brzi poslovi",  href: "/brzi-poslovi" },
    { icon: "za-firme",    label: "Nudim posao",   href: "/za-firme" },
    { icon: "firme",       label: "Poslodavci",    href: "/firme" }
  ],
  candidate: [
    { icon: "oglasi",      label: "Oglasi",        href: "/oglasi" },
    { icon: "brzi",        label: "Brzi poslovi",  href: "/brzi-poslovi" },
    { icon: "profil",      label: "Profil",        href: "/profil" },
    { icon: "prijave",     label: "Prijave",       href: "/profil/prijave" }
  ],
  company: [
    { icon: "pregled",     label: "Dashboard",     href: "/firma" },
    { icon: "novi",        label: "Novi oglas",    href: "/firma/novi-oglas" },
    { icon: "selekcija",   label: "Selekcija",     href: "/firma/selekcija" },
    { icon: "brzi",        label: "Brzi angažman", href: "/firma/brzi-angazman" },
    { icon: "kandidati",   label: "Dostupni radnici", href: "/firma/radnici" },
    { icon: "baneri",      label: "Reklame",       href: "/firma/baneri" }
  ],
  admin: [
    { icon: "pregled",     label: "Admin",            href: "/admin" },
    { icon: "oglasi",      label: "Oglasi",           href: "/admin/oglasi" },
    { icon: "firme",       label: "Firme",            href: "/admin/firme" },
    { icon: "brzi",        label: "Brzi profili",     href: "/admin/brzi-profili" },
    { icon: "novi",        label: "Brzi angažmani",   href: "/admin/brzi-angazmani" },
    { icon: "prijave",     label: "Upiti radnicima",  href: "/admin/brzi-kontakti" },
    { icon: "uplate",      label: "Uplate",           href: "/admin/uplate" }
  ]
};

export const mobileNavItems: Record<UserRole, NavItem[]> = {
  guest: [
    { icon: "home",        label: "Početna",   href: "/" },
    { icon: "oglasi",      label: "Oglasi",    href: "/oglasi" },
    { icon: "brzi",        label: "Brzi",      href: "/brzi-poslovi" },
    { icon: "firme",       label: "Firme",     href: "/firme" },
    { icon: "login",       label: "Prijava",   href: "/login" }
  ],
  candidate: [
    { icon: "oglasi",      label: "Oglasi",    href: "/oglasi" },
    { icon: "brzi",        label: "Brzi",      href: "/brzi-poslovi" },
    { icon: "prijave",     label: "Prijave",   href: "/profil/prijave" },
    { icon: "usluge",      label: "Usluge",    href: "/profil/brzi-profil" },
    { icon: "profil",      label: "Profil",    href: "/profil" }
  ],
  company: [
    { icon: "pregled",     label: "Pregled",   href: "/firma" },
    { icon: "novi",        label: "Novi oglas", href: "/firma/novi-oglas" },
    { icon: "brzi",        label: "Brzi",      href: "/firma/brzi-angazman" },
    { icon: "selekcija",   label: "Selekcija", href: "/firma/selekcija" },
    { icon: "kandidati",   label: "Radnici",   href: "/firma/radnici" },
    { icon: "baneri",      label: "Reklame",   href: "/firma/baneri" }
  ],
  admin: [
    { icon: "home",        label: "Pregled",   href: "/admin" },
    { icon: "oglasi",      label: "Oglasi",    href: "/admin/oglasi" },
    { icon: "brzi",        label: "Profili",   href: "/admin/brzi-profili" },
    { icon: "novi",        label: "Angažmani", href: "/admin/brzi-angazmani" },
    { icon: "firme",       label: "Firme",     href: "/admin/firme" },
    { icon: "uplate",      label: "Uplate",    href: "/admin/uplate" }
  ]
};
