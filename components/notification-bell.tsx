"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { getNotifications, markNotificationsRead } from "@/lib/queries/account";
import type { Notification } from "@/types/domain";

export function NotificationBell() {
  const { userId, ready } = useAuth();
  const [items, setItems] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!ready || !userId) return;
    getNotifications(userId, 10).then(setItems);

    // Poll svakih 60s — lightweight, bez websocket-a
    const interval = setInterval(() => {
      if (userId) getNotifications(userId, 10).then(setItems);
    }, 60_000);

    return () => clearInterval(interval);
  }, [ready, userId]);

  if (!userId) return null;

  const unread = items.filter(i => !i.read).length;

  function toggle() {
    const next = !open;
    setOpen(next);
    if (next && unread > 0 && userId) {
      markNotificationsRead(userId, items.filter(i => !i.read).map(i => i.id));
      // Optimistično označi kao pročitano lokalno
      setTimeout(() => setItems(items.map(i => ({ ...i, read: true }))), 200);
    }
  }

  return (
    <div className="notification-bell">
      <button
        type="button"
        className="icon-btn"
        onClick={toggle}
        aria-label={`Notifikacije${unread ? ` (${unread} novih)` : ""}`}
        aria-expanded={open}
      >
        🔔
        {unread > 0 && <span className="bell-badge">{unread > 9 ? "9+" : unread}</span>}
      </button>
      {open && (
        <div className="notification-panel" role="dialog">
          <div className="notification-head">
            <strong>Notifikacije</strong>
            <button type="button" onClick={() => setOpen(false)} className="icon-btn sm" aria-label="Zatvori">×</button>
          </div>
          <div className="notification-list">
            {items.length === 0 ? (
              <p className="empty-text">Nemaš notifikacija.</p>
            ) : items.map(n => (
              n.link ? (
                <Link key={n.id} href={n.link} className={`notification-item${!n.read ? " unread" : ""}`} onClick={() => setOpen(false)}>
                  <strong>{n.title}</strong>
                  {n.message && <p>{n.message}</p>}
                  <small>{new Date(n.created_at).toLocaleString("sr-ME")}</small>
                </Link>
              ) : (
                <div key={n.id} className={`notification-item${!n.read ? " unread" : ""}`}>
                  <strong>{n.title}</strong>
                  {n.message && <p>{n.message}</p>}
                  <small>{new Date(n.created_at).toLocaleString("sr-ME")}</small>
                </div>
              )
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
