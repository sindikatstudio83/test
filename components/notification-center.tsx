"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { createBrowserSupabase } from "@/lib/supabase/client";
import { logError } from "@/lib/errors";
import type { Notification } from "@/types/domain";

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "sad";
  if (min < 60) return `prije ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `prije ${h} h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `prije ${d} dana`;
  return new Date(iso).toLocaleDateString("sr-ME");
}

export function NotificationCenter() {
  const { userId, ready } = useAuth();
  const [items, setItems] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [panelStyle, setPanelStyle] = useState<React.CSSProperties>({});
  const wrapRef = useRef<HTMLDivElement>(null);
  const loaded = useRef(false);

  const unreadCount = items.filter(n => !n.read).length;

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const supabase = createBrowserSupabase();
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("recipient_id", userId)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) {
        logError("NotificationCenter.load", error);
      } else {
        setItems((data || []) as Notification[]);
        loaded.current = true;
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (!ready || !userId) return;

    // Initial load
    load();

    // ── Realtime subscription for instant notification delivery ──────
    // Falls back to polling if Realtime channel fails.
    const supabase = createBrowserSupabase();
    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `recipient_id=eq.${userId}`,
        },
        () => {
          // New notification arrived — reload the list
          load();
        }
      )
      .subscribe();

    // ── Polling fallback — paused when tab is hidden ──────────────────
    // 60s interval, only runs when tab is visible.
    let intervalId: ReturnType<typeof setInterval> | null = null;

    function startPolling() {
      if (intervalId) return;
      intervalId = setInterval(() => {
        if (!document.hidden) load();
      }, 60_000);
    }

    function stopPolling() {
      if (intervalId) { clearInterval(intervalId); intervalId = null; }
    }

    function onVisibilityChange() {
      if (document.hidden) stopPolling();
      else { load(); startPolling(); }
    }

    startPolling();
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      supabase.removeChannel(channel);
      stopPolling();
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [ready, userId, load]);

  // FIX: na mobilnom panel je fixed i ne može ići van ekrana
  useEffect(() => {
    if (!open) return;
    const isMobile = window.innerWidth <= 860;
    if (isMobile) {
      // fixed panel ispod headera, puna širina sa marginama
      setPanelStyle({
        position: "fixed",
        top: "64px",
        left: "12px",
        right: "12px",
        width: "auto",
      });
    } else {
      // desktop: absolute desno, ali ne van ekrana
      if (wrapRef.current) {
        const rect = wrapRef.current.getBoundingClientRect();
        const panelWidth = 360;
        const leftEdge = rect.right - panelWidth;
        setPanelStyle({ right: leftEdge < 8 ? -(panelWidth - rect.width - 8) : 0 });
      }
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onMouseDown(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  async function markRead(id: number) {
    setItems(it => it.map(n => n.id === id ? { ...n, read: true } : n));
    try {
      const supabase = createBrowserSupabase();
      const { error } = await supabase.from("notifications").update({ read: true }).eq("id", id);
      if (error) logError("NotificationCenter.markRead", error);
    } catch { /* silent */ }
  }

  async function markAllRead() {
    if (!userId) return;
    setItems(it => it.map(n => ({ ...n, read: true })));
    try {
      const supabase = createBrowserSupabase();
      const { error } = await supabase
        .from("notifications")
        .update({ read: true })
        .eq("recipient_id", userId)
        .eq("read", false);
      if (error) logError("NotificationCenter.markAllRead", error);
    } catch { /* silent */ }
  }

  function handleOpen() {
    const next = !open;
    setOpen(next);
    if (next && !loaded.current && userId) load();
  }

  if (!ready || !userId) return null;

  return (
    <div className="notif-wrap" ref={wrapRef}>
      <button
        type="button"
        className="icon-btn notif-btn"
        onClick={handleOpen}
        aria-label={`Obavještenja${unreadCount ? ` (${unreadCount} novih)` : ""}`}
        aria-expanded={open}
        aria-haspopup="true"
      >
        <span aria-hidden>🔔</span>
        {unreadCount > 0 && (
          <span className="notif-dot" aria-hidden>{unreadCount > 9 ? "9+" : unreadCount}</span>
        )}
      </button>

      {open && (
        <>
          {/* Backdrop: zatvara panel tapom van — vidljiv samo na mobilnom */}
          <div
            className="notif-backdrop"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <div
            className="notif-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="notif-panel-title"
            style={panelStyle}
          >
            <div className="notif-head">
              <strong id="notif-panel-title">Obavještenja</strong>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                {unreadCount > 0 && (
                  <button type="button" className="mini-link" onClick={markAllRead}>
                    Označi sve kao pročitano
                  </button>
                )}
                <button
                  type="button"
                  className="icon-btn"
                  style={{ width: 28, height: 28, fontSize: 18 }}
                  onClick={() => setOpen(false)}
                  aria-label="Zatvori obavještenja"
                >
                  ×
                </button>
              </div>
            </div>

            <div style={{ maxHeight: "min(400px, 60vh)", overflowY: "auto" }}>
              {loading && items.length === 0 && (
                <div className="notif-empty">
                  <p style={{ color: "var(--muted)", fontSize: 13 }}>Učitavanje...</p>
                </div>
              )}
              {!loading && items.length === 0 && (
                <div className="notif-empty">
                  <strong>Nema obavještenja</strong>
                  <p>Tvoja obavještenja će se pojavljivati ovdje.</p>
                </div>
              )}
              {items.map(n => {
                const inner = (
                  <div
                    className={`notif-item${n.read ? "" : " unread"}`}
                    onClick={() => !n.link && markRead(n.id)}
                  >
                    <div className="notif-item-head">
                      <strong>{n.title}</strong>
                      <span>{relativeTime(n.created_at)}</span>
                    </div>
                    {n.message && <p>{n.message}</p>}
                  </div>
                );
                return n.link ? (
                  <Link
                    href={n.link}
                    key={n.id}
                    className="notif-link"
                    onClick={() => { markRead(n.id); setOpen(false); }}
                  >
                    {inner}
                  </Link>
                ) : (
                  <div key={n.id}>{inner}</div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
