"use client";

import React from "react";

export type SortKey = "name" | "set" | "rarity" | "newest";

export type FiltersState = {
  set: string;
  rarity: string;
  type: string;
  owned: boolean;
  wishlisted: boolean;
  sort: SortKey;
};

export type FilterOptions = {
  sets: string[];
  rarities: string[];
  types: string[];
};

export default function FiltersBar({
  options,
  value,
  onChange,
  onClear,
}: {
  options: FilterOptions;
  value: FiltersState;
  onChange: (next: FiltersState) => void;
  onClear: () => void;
}) {
  function patch<K extends keyof FiltersState>(key: K, v: FiltersState[K]) {
    onChange({ ...value, [key]: v });
  }

  return (
    <div style={wrap}>
      <div style={row}>
        <label style={label}>
          <span style={labelText}>Set</span>
          <select
            value={value.set}
            onChange={(e) => patch("set", e.target.value)}
            style={select}
          >
            <option value="">All</option>
            {options.sets.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>

        <label style={label}>
          <span style={labelText}>Rarity</span>
          <select
            value={value.rarity}
            onChange={(e) => patch("rarity", e.target.value)}
            style={select}
          >
            <option value="">All</option>
            {options.rarities.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </label>

        <label style={label}>
          <span style={labelText}>Type</span>
          <select
            value={value.type}
            onChange={(e) => patch("type", e.target.value)}
            style={select}
          >
            <option value="">All</option>
            {options.types.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div style={row2}>
        <label style={toggle}>
          <input
            type="checkbox"
            checked={value.owned}
            onChange={(e) => patch("owned", e.target.checked)}
          />
          <span>Owned</span>
        </label>

        <label style={toggle}>
          <input
            type="checkbox"
            checked={value.wishlisted}
            onChange={(e) => patch("wishlisted", e.target.checked)}
          />
          <span>Wishlisted</span>
        </label>

        <label style={{ ...label, minWidth: 220 }}>
          <span style={labelText}>Sort</span>
          <select
            value={value.sort}
            onChange={(e) => patch("sort", e.target.value as SortKey)}
            style={select}
          >
            <option value="name">Name</option>
            <option value="set">Set</option>
            <option value="rarity">Rarity</option>
            <option value="newest">Newest added</option>
          </select>
        </label>

        <button type="button" onClick={onClear} style={clearBtn}>
          Clear
        </button>
      </div>
    </div>
  );
}

/* ===== styles ===== */

const wrap: React.CSSProperties = {
  marginTop: 12,
  paddingTop: 12,
  borderTop: "1px solid rgba(255,255,255,0.08)",
  display: "grid",
  gap: 10,
};

const row: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  gap: 10,
};

const row2: React.CSSProperties = {
  display: "flex",
  gap: 12,
  flexWrap: "wrap",
  alignItems: "flex-end",
};

const label: React.CSSProperties = {
  display: "grid",
  gap: 6,
};

const labelText: React.CSSProperties = {
  fontSize: 12,
  opacity: 0.65,
};

const select: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: 14,
  border: "1px solid rgba(255,255,255,0.14)",

  // ✅ requested: black background + white text
  background: "#000",
  color: "#fff",

  outline: "none",
  fontSize: 13,

  // Helps keep the native arrow visible on some browsers
  WebkitAppearance: "none",
  MozAppearance: "none",
  appearance: "none",

  // make the list items match (works in many browsers)
  colorScheme: "dark",
};

const toggle: React.CSSProperties = {
  display: "flex",
  gap: 8,
  alignItems: "center",
  fontSize: 13,
  opacity: 0.85,
  padding: "6px 10px",
  borderRadius: 12,
  border: "1px solid rgba(255,255,255,0.12)",
  background: "rgba(0,0,0,0.20)",
};

const clearBtn: React.CSSProperties = {
  padding: "10px 12px",
  borderRadius: 14,
  border: "1px solid rgba(255,255,255,0.14)",
  background: "rgba(255,255,255,0.06)",
  color: "rgba(255,255,255,0.85)",
  cursor: "pointer",
};
