"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";

type Lookup = { id: number; name: string; slug?: string };

interface Props {
  cities: Lookup[];
  categories: Lookup[];
  currentQ: string;
  currentCity: string;
  currentCategory: string;
  activeFilterCount: number;
}

export function MobileFilterDrawer({ cities, categories, currentQ, currentCity, currentCategory, activeFilterCount }: Props) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState(currentQ);
  const [city, setCity] = useState(currentCity);
  const [category, setCategory] = useState(currentCategory);
  const router = useRouter();
  const panelRef = useRef<HTMLDivElement>(null);

  // Close on back button
  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  function apply() {
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    if (city) params.set("city", city);
    if (category) params.set("category", category);
    router.push(`/oglasi${params.size ? "?" + params.toString() : ""}`);
    setOpen(false);
  }

  function clear() {
    setQ(""); setCity(""); setCategory("");
    router.push("/oglasi");
    setOpen(false);
  }

  return (
    <div className="mobile-only">
      {/* Search bar + filter button */}
      <div className="filter-bar">
        <form className="search-inline" style={{ flex: 1 }} onSubmit={e => { e.preventDefault(); apply(); }}>
          <input
            placeholder="Traži posao..."
            value={q}
            onChange={e => setQ(e.target.value)}
          />
          <button type="submit">→</button>
        </form>
        <button
          type="button"
          className="filter-toggle-btn"
          onClick={() => setOpen(true)}
          aria-label="Otvori filtere"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="4" y1="6" x2="20" y2="6"/><line x1="8" y1="12" x2="20" y2="12"/><line x1="12" y1="18" x2="20" y2="18"/>
          </svg>
          Filteri
          {activeFilterCount > 0 && (
            <span className="filter-count">{activeFilterCount}</span>
          )}
        </button>
      </div>

      {/* Drawer */}
      <div className={`filter-drawer${open ? " open" : ""}`} role="dialog" aria-modal="true" aria-label="Filteri">
        <div className="filter-drawer-backdrop" onClick={() => setOpen(false)} />
        <div className="filter-drawer-panel" ref={panelRef}>
          <div className="filter-drawer-handle" />
          <h2 className="filter-drawer-title">Filteri</h2>
          <div className="filter-drawer-fields">
            <label>
              Pretraga
              <input
                type="text"
                placeholder="Naziv posla, firma..."
                value={q}
                onChange={e => setQ(e.target.value)}
              />
            </label>
            <label>
              Grad
              <select value={city} onChange={e => setCity(e.target.value)}>
                <option value="">Svi gradovi</option>
                {cities.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
              </select>
            </label>
            <label>
              Kategorija
              <select value={category} onChange={e => setCategory(e.target.value)}>
                <option value="">Sve kategorije</option>
                {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
              </select>
            </label>
          </div>
          <div className="filter-drawer-actions">
            {(q || city || category) && (
              <button type="button" className="btn ghost" onClick={clear}>Poništi</button>
            )}
            <button type="button" className="btn blue" onClick={apply} style={{ flex: 2 }}>
              Primijeni filtere
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
