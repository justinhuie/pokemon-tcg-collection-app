/* eslint-disable @next/next/no-img-element */
"use client";

// Import libraries
import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import TopNav from "@/app/components/TopNav";
import FiltersBar, { FiltersState, FilterOptions } from "@/app/components/FilterBar";
import {
  getCollectionMap,
  getWishlistIds,
  subscribeToStorageChange,
} from "@/lib/tcgStorage";

// SearchCard Data Structure
type SearchCard = {
  id: string;
  name: string;
  supertype: string | null;
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

// Fetch a single card's details for local-mode display
async function fetchCardDetail(id: string): Promise<SearchCard | null> {
  try {
    const res = await fetch(`/api/cards/${encodeURIComponent(id)}/detail`, {
      cache: "no-store",
    });
    if (!res.ok) return null;
    const json = (await res.json()) as {
      data: {
        id: string;
        name: string;
        supertype?: string | null;
        set_id?: string | null;
        set_name?: string | null;
        number?: string | null;
        rarity?: string | null;
        types?: string[];
        images?: { small?: string | null; large?: string | null };
        image_small?: string | null;
      };
    };
    const d = json.data;
    return {
      id: d.id,
      name: d.name,
      supertype: d.supertype ?? null,
      set_id: d.set_id ?? null,
      set_name: d.set_name ?? null,
      number: d.number ?? null,
      rarity: d.rarity ?? null,
      types: d.types ?? [],
      image_small: d.image_small ?? d.images?.small ?? null,
      image_large: d.images?.large ?? null,
      owned_qty: 0,
      wishlisted: false,
    };
  } catch {
    return null;
  }
}

// Constants
const SCAN_PREFILL_KEY = "scan:lastQuery";
const PAGE_SIZE = 30;

// Home Page
function HomePageInner() {
  const searchParams = useSearchParams();
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

  // localStorage state for owned/wishlisted filtering
  const [collectionMap, setCollectionMap] = useState<Record<string, number>>({});
  const [wishlistIds, setWishlistIds] = useState<string[]>([]);
  const [localCards, setLocalCards] = useState<SearchCard[]>([]);
  const [localLoading, setLocalLoading] = useState(false);

  useEffect(() => {
    const refresh = () => {
      setCollectionMap(getCollectionMap());
      setWishlistIds(getWishlistIds());
    };
    refresh();
    return subscribeToStorageChange(refresh);
  }, []);

  useEffect(() => {
    // URL params (from "Back to search") take priority over localStorage prefill
    const urlQ = searchParams.get("q");
    const urlSet = searchParams.get("set") ?? "";
    const urlRarity = searchParams.get("rarity") ?? "";
    const urlType = searchParams.get("type") ?? "";
    const urlSort = (searchParams.get("sort") ?? "name") as FiltersState["sort"];

    if (urlQ) {
      setQ(urlQ.trim());
    } else {
      try {
        const last = localStorage.getItem(SCAN_PREFILL_KEY);
        if (last && last.trim().length >= 2) setQ(last.trim());
      } catch {}
    }

    if (urlSet || urlRarity || urlType || urlSort !== "name") {
      setFilters((prev) => ({
        ...prev,
        set: urlSet || prev.set,
        rarity: urlRarity || prev.rarity,
        type: urlType || prev.type,
        sort: urlSort,
      }));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/filters", { cache: "no-store" });
        if (!res.ok) return;
        const json = (await res.json()) as { data: FilterOptions };
        if (json?.data) setFilterOptions(json.data);
      } catch {
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

  // "Local mode": only owned/wishlisted checked, no text/set/rarity/type — serve
  // results directly from localStorage without hitting the search API.
  const localMode =
    q.trim().length < 2 &&
    !filters.set &&
    !filters.rarity &&
    !filters.type &&
    filters.sort === "name" &&
    (filters.owned || filters.wishlisted);

  const localIds = useMemo(() => {
    if (!localMode) return [];
    const ownedIds = filters.owned
      ? Object.keys(collectionMap).filter((id) => (collectionMap[id] ?? 0) > 0)
      : [];
    const wIds = filters.wishlisted ? wishlistIds : [];
    return [...new Set([...ownedIds, ...wIds])];
  }, [localMode, filters.owned, filters.wishlisted, collectionMap, wishlistIds]);

  const localIdsKey = localIds.join("|");

  // Fetch card details for local mode
  useEffect(() => {
    if (!localMode) {
      setLocalCards([]);
      return;
    }
    if (localIds.length === 0) {
      setLocalCards([]);
      setLocalLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setLocalLoading(true);
      try {
        const results = await Promise.all(localIds.map((id) => fetchCardDetail(id)));
        if (cancelled) return;
        const fetched = results.filter((x): x is SearchCard => x !== null).map((c) => ({
          ...c,
          owned_qty: collectionMap[c.id] ?? 0,
          wishlisted: wishlistIds.includes(c.id),
        }));
        setLocalCards(fetched);
      } finally {
        if (!cancelled) setLocalLoading(false);
      }
    })();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localIdsKey, localMode]);

  function buildParams(query: string, p: number) {
    const params = new URLSearchParams();
    params.set("limit", String(PAGE_SIZE));
    params.set("page", String(p));

    if (query.length >= 2) params.set("q", query);
    if (filters.set) params.set("set", filters.set);
    if (filters.rarity) params.set("rarity", filters.rarity);
    if (filters.type) params.set("type", filters.type);
    if (filters.sort) params.set("sort", filters.sort);

    return params;
  }

  useEffect(() => {
    // Local mode is handled by its own effect above
    if (localMode) {
      setCards([]);
      setError(null);
      setPage(1);
      setHasMore(false);
      return;
    }

    const query = q.trim();

    const hasAnyFilter =
      !!filters.set ||
      !!filters.rarity ||
      !!filters.type ||
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

  // Build the URL to return to when clicking "Back to search" from a card
  const backHref = useMemo(() => {
    const p = new URLSearchParams();
    if (q.trim().length >= 2) p.set("q", q.trim());
    if (filters.set) p.set("set", filters.set);
    if (filters.rarity) p.set("rarity", filters.rarity);
    if (filters.type) p.set("type", filters.type);
    if (filters.sort !== "name") p.set("sort", filters.sort);
    const qs = p.toString();
    return qs ? `/?${qs}` : "/";
  }, [q, filters]);

  // Enrich server results with live owned/wishlisted from localStorage,
  // then apply client-side owned/wishlisted filtering
  const displayCards = useMemo(() => {
    if (localMode) return localCards;
    let result = cards.map((c) => ({
      ...c,
      owned_qty: collectionMap[c.id] ?? 0,
      wishlisted: wishlistIds.includes(c.id),
    }));
    if (filters.owned) result = result.filter((c) => c.owned_qty > 0);
    if (filters.wishlisted) result = result.filter((c) => c.wishlisted);
    return result;
  }, [localMode, localCards, cards, collectionMap, wishlistIds, filters.owned, filters.wishlisted]);

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
      <div style={glow} aria-hidden="true" />

      <div style={content}>
        <div style={shell}>
          <header style={topbar}>
            <div style={{ minWidth: 0 }}>
              <div style={eyebrow}>Card Database</div>
              <h1 style={h1}>Pokémon TCG Catalog</h1>
              <div style={sub}>Search For Any Card</div>
            </div>

            <TopNav active="search" />
          </header>

          <div className="search-card" style={searchCard}>
            <div className="search-row" style={searchRow}>
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
                ) : loading || localLoading ? (
                  <span style={{ opacity: 0.75 }}>Searching…</span>
                ) : q.trim().length >= 2 || filtersActive ? (
                  <span style={{ opacity: 0.75 }}>{displayCards.length} result(s)</span>
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
            {displayCards.length === 0 && (q.trim().length >= 2 || filtersActive) && !(loading || localLoading) && !error ? (
              <div style={empty}>
                <div style={{ fontWeight: 900 }}>No matches</div>
                <div style={{ marginTop: 6, opacity: 0.7, fontSize: 13 }}>
                  Try fewer words or clear a filter.
                </div>
              </div>
            ) : null}

            <div style={resultsGrid}>
              {displayCards.map((c) => {
                const thumb = proxiedImage(c.image_small);

                return (
                  <Link key={c.id} href={`/cards/${c.id}?back=${encodeURIComponent(backHref)}`} style={resultCard} className="result-card">
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
                              <span key={t} style={typeChipStyle(t)}>
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
                          <span style={typeChipStyle(c.supertype ?? "")}>
                            {c.supertype ?? "No types"}
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>

            {displayCards.length > 0 ? (
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
  zIndex: 0,
};

const content: React.CSSProperties = {
  position: "relative",
  zIndex: 1,
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
  border: "1px solid rgba(124,92,255,0.35)",
  background: "rgba(4,2,14,0.72)",
  boxShadow: "0 0 0 1px rgba(124,92,255,0.10), 0 0 40px rgba(124,92,255,0.13), 0 20px 60px rgba(0,0,0,0.42), inset 0 1px 0 rgba(255,255,255,0.07)",
};

const searchRow: React.CSSProperties = {
  display: "flex",
  gap: 10,
  alignItems: "center",
  padding: "12px 14px",
  borderRadius: 16,
  border: "1px solid rgba(124,92,255,0.28)",
  background: "rgba(18,10,42,0.62)",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.05)",
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
  border: "1px solid rgba(124,92,255,0.18)",
  background: "rgba(4,2,14,0.60)",
  textDecoration: "none",
  color: "inherit",
  boxShadow: "0 0 0 1px rgba(124,92,255,0.06), 0 18px 60px rgba(0,0,0,0.32), inset 0 1px 0 rgba(255,255,255,0.06)",
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
  const glow = TYPE_GLOW[typeName];
  if (!glow) return chip;
  return {
    ...chip,
    border: `1px solid ${glow.border}`,
    boxShadow: glow.shadow,
    color: glow.color,
  };
}

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

export default function HomePage() {
  return (
    <Suspense>
      <HomePageInner />
    </Suspense>
  );
}
