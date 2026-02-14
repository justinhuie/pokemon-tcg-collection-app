/* eslint-disable @next/next/no-img-element */
"use client";

// Import libraries
import { useEffect, useState } from "react";
import Link from "next/link";
import TopNav from "@/app/components/TopNav";
import FiltersBar, { FiltersState, FilterOptions } from "@/app/components/FilterBar";

// SearchCard Data Structure
type SearchCard = {
  id: string;
  name: string;
  set_id: string | null;
  set_name: string | null;
  number: string | null;
  rarity: string | null;
  types: string[];
  image_small: string | null;
  image_large: string | null;

  owned_qty: number;
  wishlisted: boolean;
};

// Get Pokemon Card Image
function proxiedImage(url: string | null): string | null {
  if (!url) return null;
  return `/api/img?url=${encodeURIComponent(url)}`;
}

// Constants
const SCAN_PREFILL_KEY = "scan:lastQuery";
const PAGE_SIZE = 30;

// Home Page
export default function HomePage() {
  const [q, setQ] = useState("");
  const [cards, setCards] = useState<SearchCard[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    sets: [],
    rarities: [],
    types: [],
  });

  const [filters, setFilters] = useState<FiltersState>({
    set: "",
    rarity: "",
    type: "",
    owned: false,
    wishlisted: false,
    sort: "name",
  });

  useEffect(() => {
    try {
      const last = localStorage.getItem(SCAN_PREFILL_KEY);
      if (last && last.trim().length >= 2) setQ(last.trim());
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/filters", { cache: "no-store" });
        if (!res.ok) return;
        const json = (await res.json()) as { data: FilterOptions };
        if (json?.data) setFilterOptions(json.data);
      } catch {
        // ignore
      }
    })();
  }, []);

  const filtersActive =
    !!filters.set ||
    !!filters.rarity ||
    !!filters.type ||
    filters.owned ||
    filters.wishlisted ||
    filters.sort !== "name";

  function buildParams(query: string, p: number) {
    const params = new URLSearchParams();
    params.set("limit", String(PAGE_SIZE));
    params.set("page", String(p));

    if (query.length >= 2) params.set("q", query);
    if (filters.set) params.set("set", filters.set);
    if (filters.rarity) params.set("rarity", filters.rarity);
    if (filters.type) params.set("type", filters.type);
    if (filters.owned) params.set("owned", "1");
    if (filters.wishlisted) params.set("wishlisted", "1");
    if (filters.sort) params.set("sort", filters.sort);

    return params;
  }

  useEffect(() => {
    const query = q.trim();

    const hasAnyFilter =
      !!filters.set ||
      !!filters.rarity ||
      !!filters.type ||
      filters.owned ||
      filters.wishlisted ||
      filters.sort !== "name";

    if (query.length < 2 && !hasAnyFilter) {
      setCards([]);
      setError(null);
      setLoading(false);
      setLoadingMore(false);
      setPage(1);
      setHasMore(false);
      return;
    }

    const controller = new AbortController();
    const t = setTimeout(async () => {
      setLoading(true);
      setError(null);

      try {
        const params = buildParams(query, 1);
        const res = await fetch(`/api/search-cards?${params.toString()}`, {
          signal: controller.signal,
          cache: "no-store",
        });

        if (!res.ok) {
          const text = await res.text();
          throw new Error(text || `HTTP ${res.status}`);
        }

        const json = (await res.json()) as { data: SearchCard[] };
        const fresh = Array.isArray(json.data) ? json.data : [];

        setCards(fresh);
        setPage(1);
        setHasMore(fresh.length === PAGE_SIZE);
      } catch (err: unknown) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        const msg = err instanceof Error ? err.message : "Search failed";
        setError(msg);
        setCards([]);
        setPage(1);
        setHasMore(false);
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => {
      clearTimeout(t);
      controller.abort();
    };
  }, [q, filters]);

  async function loadMore() {
    if (loadingMore || loading) return;
    if (!hasMore) return;

    const query = q.trim();

    setLoadingMore(true);
    setError(null);

    try {
      const nextPage = page + 1;
      const params = buildParams(query, nextPage);

      const res = await fetch(`/api/search-cards?${params.toString()}`, {
        cache: "no-store",
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `HTTP ${res.status}`);
      }

      const json = (await res.json()) as { data: SearchCard[] };
      const more = Array.isArray(json.data) ? json.data : [];

      setCards((prev) => {
        const seen = new Set(prev.map((x) => x.id));
        const merged = [...prev];

        for (const item of more) {
          if (!seen.has(item.id)) {
            seen.add(item.id);
            merged.push(item);
          }
        }

        return merged;
      });

      setPage(nextPage);
      setHasMore(more.length === PAGE_SIZE);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load more.");
    } finally {
      setLoadingMore(false);
    }
  }

  return (
    <div style={wrap}>
      {/* background only (never steals clicks) */}
      <div style={glow} aria-hidden="true" />

      {/* content above background */}
      <div style={content}>
        {/* ✅ wider, responsive container */}
        <div style={shell}>
          <header style={topbar}>
            <div style={{ minWidth: 0 }}>
              <div style={eyebrow}>Card Database</div>
              <h1 style={h1}>Pokémon TCG Catalog</h1>
              <div style={sub}>Search For Any Card</div>
            </div>

            <TopNav active="search" />
          </header>

          <div style={searchCard}>
            <div style={searchRow}>
              <span style={searchIcon} aria-hidden="true">
                ⌕
              </span>

              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search cards (e.g., charizard, pikachu, umbreon v)"
                style={searchInput}
                spellCheck={false}
                autoComplete="off"
              />

              {q ? (
                <button
                  type="button"
                  onClick={() => setQ("")}
                  style={clearBtn}
                  aria-label="Clear"
                  title="Clear"
                >
                  ✕
                </button>
              ) : null}
            </div>

            <div style={statusRow}>
              <div style={{ fontSize: 13 }}>
                {error ? (
                  <span style={{ color: "rgba(255,160,160,0.95)" }}>⚠ {error}</span>
                ) : loading ? (
                  <span style={{ opacity: 0.75 }}>Searching…</span>
                ) : q.trim().length >= 2 || filtersActive ? (
                  <span style={{ opacity: 0.75 }}>{cards.length} result(s)</span>
                ) : (
                  <span style={{ opacity: 0.65 }}>
                    Type 2+ characters (or use filters) to search.
                  </span>
                )}
              </div>

              <div style={tipText}>Tip: try “V”, “ex”, “GX”, set names, or card numbers.</div>
            </div>

            <FiltersBar
              options={filterOptions}
              value={filters}
              onChange={setFilters}
              onClear={() =>
                setFilters({
                  set: "",
                  rarity: "",
                  type: "",
                  owned: false,
                  wishlisted: false,
                  sort: "name",
                })
              }
            />
          </div>

          <main style={{ marginTop: 14 }}>
            {cards.length === 0 && (q.trim().length >= 2 || filtersActive) && !loading && !error ? (
              <div style={empty}>
                <div style={{ fontWeight: 900 }}>No matches</div>
                <div style={{ marginTop: 6, opacity: 0.7, fontSize: 13 }}>
                  Try fewer words or clear a filter.
                </div>
              </div>
            ) : null}

            {/* ✅ auto-fill grid: expands to 3–4 columns on big screens */}
            <div style={resultsGrid}>
              {cards.map((c) => {
                const thumb = proxiedImage(c.image_small);

                return (
                  <Link key={c.id} href={`/cards/${c.id}`} style={resultCard}>
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
                      <div style={nameRow}>
                        <div style={{ minWidth: 0 }}>
                          <div style={name} title={c.name}>
                            {c.name}
                          </div>

                          <div style={badgesRow}>
                            {c.owned_qty > 0 ? (
                              <span style={badgeStrong}>Owned x{c.owned_qty}</span>
                            ) : null}
                            {c.wishlisted ? <span style={badgeGhost}>Wishlisted</span> : null}
                          </div>
                        </div>

                        {c.rarity ? <span style={badge}>{c.rarity}</span> : null}
                      </div>

                      <div style={metaLine}>
                        <span style={{ opacity: 0.85 }}>{c.set_name ?? "Unknown set"}</span>
                        {c.number ? <span style={{ opacity: 0.5 }}>•</span> : null}
                        {c.number ? <span style={{ opacity: 0.7 }}>#{c.number}</span> : null}
                      </div>

                      <div style={chips}>
                        {c.types?.length ? (
                          <>
                            {c.types.slice(0, 4).map((t) => (
                              <span key={t} style={chip}>
                                {t}
                              </span>
                            ))}
                            {c.types.length > 4 ? (
                              <span style={{ ...chip, ...chipGhostStyle }}>
                                +{c.types.length - 4}
                              </span>
                            ) : null}
                          </>
                        ) : (
                          <span style={{ ...chip, ...chipGhostStyle }}>No types</span>
                        )}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>

            {/* Load more */}
            {cards.length > 0 ? (
              <div style={{ marginTop: 14, display: "flex", justifyContent: "center" }}>
                {hasMore ? (
                  <button
                    type="button"
                    onClick={loadMore}
                    disabled={loadingMore || loading}
                    style={{
                      ...loadMoreBtn,
                      opacity: loadingMore || loading ? 0.65 : 1,
                      cursor: loadingMore || loading ? "not-allowed" : "pointer",
                    }}
                  >
                    {loadingMore ? "Loading…" : "Load more"}
                  </button>
                ) : (
                  <div style={{ opacity: 0.6, fontSize: 13, padding: "10px 0" }}>End of results</div>
                )}
              </div>
            ) : null}

            <div style={{ height: 26 }} />
          </main>
        </div>
      </div>
    </div>
  );
}

/* ===== Styles ===== */

const wrap: React.CSSProperties = {
  minHeight: "100vh",
  background: "#070a10",
  color: "rgba(255,255,255,0.92)",
  padding: "clamp(18px, 2.5vw, 36px)", // ✅ responsive padding
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
  zIndex: 0,
};

const content: React.CSSProperties = {
  position: "relative",
  zIndex: 1,
};

/** ✅ NEW: wider container (fills screen but still looks clean) */
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
  fontSize: 30,
  fontWeight: 900,
  letterSpacing: "-0.02em",
};

const sub: React.CSSProperties = {
  marginTop: 8,
  fontSize: 13,
  opacity: 0.68,
};

const searchCard: React.CSSProperties = {
  marginTop: 14,
  padding: 14,
  borderRadius: 18,
  border: "1px solid rgba(255,255,255,0.12)",
  background: "rgba(0,0,0,0.28)",
  boxShadow: "0 18px 60px rgba(0,0,0,0.22), inset 0 1px 0 rgba(255,255,255,0.05)",
};

const searchRow: React.CSSProperties = {
  display: "flex",
  gap: 10,
  alignItems: "center",
  padding: "12px 14px",
  borderRadius: 16,
  border: "1px solid rgba(255,255,255,0.14)",
  background: "rgba(0,0,0,0.30)",
};

const searchIcon: React.CSSProperties = {
  opacity: 0.7,
  userSelect: "none",
};

const searchInput: React.CSSProperties = {
  flex: 1,
  border: "none",
  outline: "none",
  background: "transparent",
  color: "rgba(255,255,255,0.92)",
  fontSize: 14,
};

const clearBtn: React.CSSProperties = {
  width: 32,
  height: 32,
  borderRadius: 12,
  border: "1px solid rgba(255,255,255,0.14)",
  background: "rgba(255,255,255,0.06)",
  color: "rgba(255,255,255,0.80)",
  cursor: "pointer",
};

const statusRow: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "baseline",
  gap: 12,
  marginTop: 10,
};

const tipText: React.CSSProperties = {
  fontSize: 12,
  opacity: 0.5,
  textAlign: "right",
};

const empty: React.CSSProperties = {
  padding: 16,
  borderRadius: 18,
  border: "1px solid rgba(255,255,255,0.12)",
  background: "rgba(0,0,0,0.28)",
  marginBottom: 12,
};

/** ✅ NEW: results grid that fills space */
const resultsGrid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))",
  gap: 12,
};

const resultCard: React.CSSProperties = {
  display: "flex",
  gap: 14,
  padding: 14,
  borderRadius: 18,
  border: "1px solid rgba(255,255,255,0.12)",
  background: "rgba(0,0,0,0.28)",
  textDecoration: "none",
  color: "inherit",
  boxShadow: "0 18px 60px rgba(0,0,0,0.22), inset 0 1px 0 rgba(255,255,255,0.05)",
};

const thumbWrap: React.CSSProperties = {
  width: 80,
  height: 112,
  borderRadius: 14,
  overflow: "hidden",
  border: "1px solid rgba(255,255,255,0.10)",
  background: "linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))",
  flexShrink: 0,
  display: "grid",
  placeItems: "center",
};

const thumbImg: React.CSSProperties = {
  width: 80,
  height: 112,
  objectFit: "cover" as const,
  display: "block",
};

const nameRow: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 10,
};

const name: React.CSSProperties = {
  fontWeight: 900,
  letterSpacing: "-0.01em",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

const badge: React.CSSProperties = {
  fontSize: 11,
  padding: "6px 8px",
  borderRadius: 999,
  border: "1px solid rgba(255,255,255,0.14)",
  background: "rgba(255,255,255,0.05)",
  color: "rgba(255,255,255,0.72)",
  flexShrink: 0,
};

const badgesRow: React.CSSProperties = {
  display: "flex",
  gap: 8,
  flexWrap: "wrap",
  marginTop: 6,
};

const badgeStrong: React.CSSProperties = {
  fontSize: 11,
  padding: "6px 9px",
  borderRadius: 999,
  border: "1px solid rgba(0,255,209,0.22)",
  background: "rgba(0,255,209,0.08)",
  color: "rgba(220,255,250,0.92)",
};

const badgeGhost: React.CSSProperties = {
  fontSize: 11,
  padding: "6px 9px",
  borderRadius: 999,
  border: "1px solid rgba(255,255,255,0.14)",
  background: "rgba(255,255,255,0.04)",
  color: "rgba(255,255,255,0.70)",
};

const metaLine: React.CSSProperties = {
  marginTop: 8,
  display: "flex",
  gap: 8,
  alignItems: "center",
  flexWrap: "wrap",
  fontSize: 13,
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

const chipGhostStyle: React.CSSProperties = {
  color: "rgba(255,255,255,0.52)",
  background: "rgba(255,255,255,0.03)",
};

const loadMoreBtn: React.CSSProperties = {
  padding: "10px 14px",
  borderRadius: 14,
  border: "1px solid rgba(255,255,255,0.14)",
  background: "rgba(0,0,0,0.22)",
  color: "rgba(255,255,255,0.88)",
  backdropFilter: "blur(10px)",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.05)",
};
