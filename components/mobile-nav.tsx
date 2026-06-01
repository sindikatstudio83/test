"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { mobileNavItems } from "@/lib/navigation";
import { useEffect, useState } from "react";

/**
 * Detektuje iOS Safari u standardnom browser modu.
 * Isključuje: Chrome iOS, Firefox iOS, Edge iOS, te PWA standalone mode.
 * Mora se pokrenuti na klijentskoj strani (useEffect).
 */
function detectIosSafari(): boolean {
  if (typeof window === "undefined" || typeof navigator === "undefined") return false;

  const ua = navigator.userAgent;

  // Mora biti iPhone ili iPad
  const isIos = /iP(hone|od|ad)/.test(ua);
  if (!isIos) return false;

  // Chrome iOS identificira se kao "CriOS"
  if (/CriOS/.test(ua)) return false;

  // Firefox iOS identificira se kao "FxiOS"
  if (/FxiOS/.test(ua)) return false;

  // Edge iOS identificira se kao "EdgiOS"
  if (/EdgiOS/.test(ua)) return false;

  // OPiOS = Opera iOS
  if (/OPiOS/.test(ua)) return false;

  // DuckDuckGo iOS browser
  if (/DuckDuckGo/.test(ua)) return false;

  // Mora sadržavati "Safari" token (standardni Safari to uvijek ima)
  if (!/Safari/.test(ua)) return false;

  // PWA standalone mode — navigator.standalone je true kada je app instalirana
  if ((navigator as Navigator & { standalone?: boolean }).standalone === true) return false;

  // display-mode: standalone / fullscreen = PWA (media query provjera)
  if (window.matchMedia("(display-mode: standalone)").matches) return false;
  if (window.matchMedia("(display-mode: fullscreen)").matches) return false;

  return true;
}

export function MobileNav() {
  const { role } = useAuth();
  const pathname = usePathname();
  const items = mobileNavItems[role];
  const [isIosSafari, setIsIosSafari] = useState(false);

  useEffect(() => {
    setIsIosSafari(detectIosSafari());
  }, []);

  const navClass = ["mobile-app-nav", isIosSafari ? "ios-safari-nav" : ""].join(" ").trim();

  return (
    <nav className={navClass} aria-label="Mobilna navigacija">
      {items.map(item => {
        const isActive =
          pathname === item.href ||
          (item.href !== "/" && pathname.startsWith(item.href));
        return (
          <Link
            href={item.href}
            key={item.href}
            className={isActive ? "active" : ""}
            aria-current={isActive ? "page" : undefined}
          >
            <span className="nav-icon" aria-hidden="true">{NAV_ICONS[item.icon] ?? "•"}</span>
            <span className="nav-label">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

/**
 * Minimalistički set unicode ikona mapiranih na icon stringove iz navigation.ts.
 * Rade na iOS Safari bez ikakvog icon fonta.
 */
const NAV_ICONS: Record<string, string> = {
  home:       "⌂",
  oglasi:     "◈",
  firme:      "⊞",
  "za-firme": "✦",
  login:      "→",
  prijave:    "◉",
  sacuvani:   "♡",
  profil:     "◎",
  upozorenja: "◌",
  pregled:    "▤",
  novi:       "⊕",
  selekcija:  "⊙",
  pretplata:  "◆",
  odjava:     "←",
  uplate:     "◇",
  korisnici:  "◯",
  baneri:     "▣",
  paketi:     "⬡",
  gradovi:    "◐",
  kategorije: "⊟",
  biografija: "▦",
  kandidati:  "◉",   // Added: missing mapping caused fallback "•" dot
  audit:      "▦",   // Added: missing mapping caused fallback "•" dot
  brzi:       "⚡",   // Brzi poslovi
  usluge:     "🧰",   // Moja ponuda usluga (radnik)
};
