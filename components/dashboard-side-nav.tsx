"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { desktopNavItems } from "@/lib/navigation";
import { initials } from "@/lib/format";
import type { UserRole } from "@/types/domain";

type SideNavRole = Extract<UserRole, "company" | "admin">;

interface DashboardSideNavProps {
  role: SideNavRole;
  email: string;
  displayName?: string | null;
}

export function DashboardSideNav({ role, email, displayName }: DashboardSideNavProps) {
  const pathname = usePathname();
  const nav = desktopNavItems[role];
  const name = displayName || email.split("@")[0];
  const avatarBg = role === "admin" ? "var(--brand-red)" : "var(--lime)";
  const roleLabel = role === "admin" ? "ADMIN" : "FIRMA";

  return (
    <aside className="side">
      <div className="side-head">
        <div className="side-avatar" style={{ background: avatarBg }}>
          {initials(name)}
        </div>
        <strong>{name}</strong>
        <small>{roleLabel} · {email}</small>
      </div>
      <nav className="side-nav" aria-label="Dashboard navigacija">
        {nav.map(item => (
          <Link
            href={item.href}
            key={item.href}
            className={pathname === item.href ? "active" : ""}
            aria-current={pathname === item.href ? "page" : undefined}
          >
            {item.label}
          </Link>
        ))}
      </nav>
      <Link href="/logout" className="side-logout">Odjava</Link>
    </aside>
  );
}
