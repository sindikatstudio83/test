"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { roleHomes, roleLabels } from "@/lib/labels";
import { desktopNavItems } from "@/lib/navigation";
import { NotificationCenter } from "@/components/notification-center";
import { Logo } from "@/components/logo";

export function Header() {
  const { role } = useAuth();
  const [theme, setTheme] = useState("light");
  const [mobileOpen, setMobileOpen] = useState(false);
  const mobileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const saved = window.localStorage.getItem("imaposlaTheme") || "light";
    setTheme(saved);
    document.documentElement.dataset.theme = saved;
  }, []);

  useEffect(() => {
    function close(e: MouseEvent) {
      if (mobileRef.current && !mobileRef.current.contains(e.target as Node)) setMobileOpen(false);
    }
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  function toggleTheme() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.dataset.theme = next;
    window.localStorage.setItem("imaposlaTheme", next);
  }

  const isLoggedIn = role !== "guest";
  const dashHref = isLoggedIn ? roleHomes[role as Exclude<typeof role, "guest">] : "/login";
  const navItems = desktopNavItems[role];

  return (
    <header className="top">
      <div className="top-in">
        <Link className="brand" href="/">
          <Logo size={34} />
        </Link>

        <nav className="nav desktop-nav" aria-label="Navigacija">
          {navItems.map(item => <Link href={item.href} key={item.href}>{item.label}</Link>)}
        </nav>

        <div className="top-actions">
          {isLoggedIn && <NotificationCenter />}
          {isLoggedIn && <span className="role-pill">{roleLabels[role]}</span>}
          <button className="icon-btn" type="button" onClick={toggleTheme} aria-label="Tema">
            {theme === "dark" ? "☀" : "🌙"}
          </button>
          {!isLoggedIn ? (
            <>
              <Link className="btn ghost" href="/login">Prijava</Link>
              <Link className="btn blue" href="/registracija">Registracija</Link>
            </>
          ) : (
            <>
              <Link className="btn ghost" href={dashHref}>{roleLabels[role]}</Link>
              <Link className="btn red" href="/logout">Odjava</Link>
            </>
          )}
          {/* Hamburger — vidljiv samo na mobilnom, za neregovirane korisnike */}
          {!isLoggedIn && (
            <button className="icon-btn hamb" type="button" onClick={() => setMobileOpen(o => !o)} aria-label="Meni">☰</button>
          )}
        </div>
      </div>

      {/* Mobile dropdown — samo za neregistrovane (za registrovane je bottom nav) */}
      {mobileOpen && !isLoggedIn && (
        <div className="mobile-nav open" ref={mobileRef}>
          {navItems.map(item => <Link href={item.href} key={item.href} onClick={() => setMobileOpen(false)}>{item.label}</Link>)}
          <Link href="/login" onClick={() => setMobileOpen(false)}>Prijava</Link>
          <Link href="/registracija" onClick={() => setMobileOpen(false)}>Registracija</Link>
        </div>
      )}
    </header>
  );
}
