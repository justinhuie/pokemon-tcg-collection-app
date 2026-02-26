"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import TopNav from "@/app/components/TopNav";
import { getWishlistIds, removeFromWishlist, subscribeToStorageChange } from "@/lib/tcgStorage";

type CardSummary = {
  id: string;
  name: string;
  set_name: string | null;
  number: string | null;
  rarity: string | null;
  supertype: string | null;
  types: string[];
  image_small: string | null;
};

function proxiedImage(url: string | null) {
  if (!url) return null;
  return `/api/img?url=${encodeURIComponent(url)}`;
}

async function fetchCardSummary(id: string): Promise<CardSummary | null> {
  const res = await fetch(`/api/cards/${encodeURIComponent(id)}/detail`, { cache: "no-store" });
  if (!res.ok) return null;

  const json = (await res.json()) as {
    data: {
      id: string;
      name: string;
      set_name: string | null;
      number: string | null;
      rarity: string | null;
      supertype?: string | null;
      types?: string[];
      images?: { small?: string | null };
      image_small?: string | null;
    };
  };

  const d = json.data;
  return {
    id: d.id,
    name: d.name,
    set_name: d.set_name ?? null,
    number: d.number ?? null,
    rarity: d.rarity ?? null,
    supertype: d.supertype ?? null,
    types: d.types ?? [],
    image_small: d.image_small ?? d.images?.small ?? null,
  };
}

export default function WishlistPage() {
  const [tick, setTick] = useState(0);
  const [items, setItems] = useState<CardSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const ids = useMemo(() => getWishlistIds(), [tick]);

  useEffect(() => {
    return subscribeToStorageChange(() => setTick((x) => x + 1));
  }, []);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      try {
        const results = await Promise.all(ids.map((id) => fetchCardSummary(id)));
        if (cancelled) return;
        setItems(results.filter((x): x is CardSummary => x !== null));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [ids.join("|")]);

  return (
    <div style={wrap}>
      <div style={glow} aria-hidden="true" />

      <div style={shell}>
        <header style={topbar}>
          <div style={{ minWidth: 0 }}>
            <div style={eyebrow}>Targets</div>
            <h1 style={h1}>My Wishlist</h1>
            <div style={sub}>
              {loading ? "Loading…" : `${items.length} item(s)`}
            </div>
          </div>

          <TopNav active="wishlist" />
        </header>

        <main style={{ marginTop: 16 }}>
          {!loading && items.length === 0 ? (
            <div style={panel}>
              <div style={{ fontWeight: 900, fontSize: 16 }}>No wishlist items</div>
              <div style={{ opacity: 0.7, marginTop: 6, fontSize: 14 }}>
                Add cards you want to track for later.
              </div>
              <div style={{ marginTop: 12 }}>
                <Link href="/" style={ctaLink}>
                  Go to Search →
                </Link>
              </div>
            </div>
          ) : (
            <div style={list}>
              {items.map((c) => {
                const thumb = proxiedImage(c.image_small);

                return (
                  <div key={c.id} style={cardOuter}>
                    <Link href={`/cards/${c.id}`} style={cardLink}>
                      <div style={thumbWrap}>
                        {thumb ? (
                          <img
                            src={thumb}
                            alt={c.name}
                            width={80}
                            height={112}
                            style={thumbImg}
                            loading="lazy"
                          />
                        ) : (
                          <span style={{ opacity: 0.6, fontSize: 12 }}>No image</span>
                        )}
                      </div>

                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={name} title={c.name}>
                          {c.name}
                        </div>

                        <div style={meta}>
                          {c.set_name ?? "Unknown set"}
                          {c.number ? ` • #${c.number}` : ""}
                          {c.rarity ? ` • ${c.rarity}` : ""}
                        </div>

                        <div style={chips}>
                          {c.types.length ? (
                            c.types.slice(0, 4).map((t) => (
                              <span key={t} style={typeChipStyle(t)}>{t}</span>
                            ))
                          ) : (
                            <span style={typeChipStyle(c.supertype ?? "")}>
                              {c.supertype ?? "No types"}
                            </span>
                          )}
                          {c.types.length > 4 ? (
                            <span style={{ ...chip, ...chipGhost }}>+{c.types.length - 4}</span>
                          ) : null}
                        </div>
                      </div>
                    </Link>

                    <div style={actionsRow}>
                      <button
                        type="button"
                        onClick={() => removeFromWishlist(c.id)}
                        style={removeBtn}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div style={{ height: 26 }} />
        </main>
      </div>
    </div>
  );
}


const wrap: React.CSSProperties = {
  minHeight: "100vh",
  background: "#070a10",
  color: "rgba(255,255,255,0.92)",
  padding: "clamp(18px, 2.5vw, 36px)",
  position: "relative",
  overflowX: "hidden",
  fontFamily:
    'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, "Apple Color Emoji", "Segoe UI Emoji"',
};

const glow: React.CSSProperties = {
  position: "absolute",
  inset: -200,
  background:
    "radial-gradient(650px 420px at 20% 0%, rgba(124, 92, 255, 0.22), transparent 60%)," +
    "radial-gradient(650px 420px at 85% 10%, rgba(0, 255, 209, 0.12), transparent 55%)," +
    "radial-gradient(740px 440px at 55% 85%, rgba(255, 140, 0, 0.10), transparent 60%)",
  filter: "blur(20px)",
  opacity: 0.95,
  pointerEvents: "none",
};

const shell: React.CSSProperties = {
  width: "min(1440px, 100%)",
  margin: "0 auto",
  position: "relative",
};

const topbar: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-end",
  gap: 14,
};

const eyebrow: React.CSSProperties = {
  fontSize: 12,
  opacity: 0.6,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
};

const h1: React.CSSProperties = {
  margin: "4px 0 0 0",
  fontSize: 34,
  fontWeight: 900,
  letterSpacing: "-0.02em",
};

const sub: React.CSSProperties = {
  marginTop: 8,
  fontSize: 14,
  opacity: 0.68,
};

const panel: React.CSSProperties = {
  padding: 18,
  borderRadius: 18,
  border: "1px solid rgba(255,255,255,0.12)",
  background: "rgba(0,0,0,0.28)",
  boxShadow:
    "0 18px 60px rgba(0,0,0,0.22), inset 0 1px 0 rgba(255,255,255,0.05)",
};

const ctaLink: React.CSSProperties = {
  textDecoration: "none",
  color: "rgba(255,255,255,0.85)",
  fontSize: 14,
  padding: "10px 12px",
  borderRadius: 14,
  border: "1px solid rgba(124,92,255,0.40)",
  background: "rgba(124,92,255,0.16)",
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
};

const list: React.CSSProperties = {
  display: "grid",
  gap: 12,
  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
};

const cardOuter: React.CSSProperties = {
  borderRadius: 18,
  border: "1px solid rgba(255,255,255,0.12)",
  background: "rgba(0,0,0,0.28)",
  boxShadow:
    "0 18px 60px rgba(0,0,0,0.22), inset 0 1px 0 rgba(255,255,255,0.05)",
  overflow: "hidden",
  minWidth: 0,
};

const cardLink: React.CSSProperties = {
  display: "flex",
  gap: 14,
  padding: 14,
  textDecoration: "none",
  color: "inherit",
  minWidth: 0,
};

const actionsRow: React.CSSProperties = {
  padding: "0 14px 14px 14px",
  display: "flex",
  justifyContent: "flex-end",
};

const removeBtn: React.CSSProperties = {
  padding: "8px 10px",
  borderRadius: 12,
  border: "1px solid rgba(255,255,255,0.14)",
  background: "rgba(0,0,0,0.22)",
  color: "rgba(255,255,255,0.85)",
  cursor: "pointer",
};

const thumbWrap: React.CSSProperties = {
  width: 80,
  height: 112,
  borderRadius: 14,
  overflow: "hidden",
  border: "1px solid rgba(255,255,255,0.10)",
  background:
    "linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))",
  flexShrink: 0,
  display: "grid",
  placeItems: "center",
};

const thumbImg: React.CSSProperties = {
  width: 80,
  height: 112,
  objectFit: "cover",
  display: "block",
};

const name: React.CSSProperties = {
  fontWeight: 900,
  letterSpacing: "-0.01em",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  fontSize: 18,
};

const meta: React.CSSProperties = {
  marginTop: 8,
  fontSize: 13,
  opacity: 0.75,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

const chips: React.CSSProperties = {
  marginTop: 10,
  display: "flex",
  gap: 8,
  flexWrap: "wrap",
};

const chip: React.CSSProperties = {
  fontSize: 12,
  padding: "6px 10px",
  borderRadius: 999,
  border: "1px solid rgba(255,255,255,0.12)",
  background: "rgba(0,0,0,0.25)",
  color: "rgba(255,255,255,0.72)",
};

const chipGhost: React.CSSProperties = {
  color: "rgba(255,255,255,0.52)",
  background: "rgba(255,255,255,0.03)",
};

const TYPE_GLOW: Record<string, { border: string; shadow: string; color: string }> = {
  Fire:       { border: "rgba(255,90,30,0.55)",   shadow: "0 0 7px 1px rgba(255,90,30,0.35)",   color: "rgba(255,180,140,0.92)" },
  Water:      { border: "rgba(40,160,255,0.55)",  shadow: "0 0 7px 1px rgba(40,160,255,0.35)",  color: "rgba(140,210,255,0.92)" },
  Grass:      { border: "rgba(50,200,80,0.55)",   shadow: "0 0 7px 1px rgba(50,200,80,0.35)",   color: "rgba(140,240,150,0.92)" },
  Lightning:  { border: "rgba(255,210,0,0.55)",   shadow: "0 0 7px 1px rgba(255,210,0,0.40)",   color: "rgba(255,235,130,0.92)" },
  Psychic:    { border: "rgba(200,60,220,0.55)",  shadow: "0 0 7px 1px rgba(200,60,220,0.35)",  color: "rgba(230,160,255,0.92)" },
  Fighting:   { border: "rgba(200,90,30,0.55)",   shadow: "0 0 7px 1px rgba(200,90,30,0.35)",   color: "rgba(230,170,120,0.92)" },
  Darkness:   { border: "rgba(130,80,200,0.55)",  shadow: "0 0 7px 1px rgba(130,80,200,0.35)",  color: "rgba(190,155,240,0.92)" },
  Metal:      { border: "rgba(160,180,200,0.55)", shadow: "0 0 7px 1px rgba(160,180,200,0.30)", color: "rgba(200,215,230,0.92)" },
  Fairy:      { border: "rgba(255,100,180,0.55)", shadow: "0 0 7px 1px rgba(255,100,180,0.35)", color: "rgba(255,185,225,0.92)" },
  Dragon:     { border: "rgba(40,90,220,0.55)",   shadow: "0 0 7px 1px rgba(40,90,220,0.35)",   color: "rgba(130,165,255,0.92)" },
  Colorless:  { border: "rgba(200,200,200,0.30)", shadow: "0 0 5px 1px rgba(200,200,200,0.15)", color: "rgba(220,220,220,0.80)" },
  Trainer:    { border: "rgba(230,230,230,0.45)", shadow: "0 0 7px 1px rgba(230,230,230,0.25)", color: "rgba(240,240,240,0.90)" },
  Energy:     { border: "rgba(230,230,230,0.45)", shadow: "0 0 7px 1px rgba(230,230,230,0.25)", color: "rgba(240,240,240,0.90)" },
};

function typeChipStyle(typeName: string): React.CSSProperties {
  const g = TYPE_GLOW[typeName];
  if (!g) return chip;
  return { ...chip, border: `1px solid ${g.border}`, boxShadow: g.shadow, color: g.color };
}