import Link from "next/link";
import TopNav from "@/app/components/TopNav";

type CollectionItem = {
  card_id?: string;
  id?: string;

  name: string;
  set_name: string | null;
  number: string | null;
  rarity: string | null;

  types: string[];

  image_small: string | null;

  qty: number;
  updated_at?: number;
};

function proxiedImage(url: string | null): string | null {
  if (!url) return null;
  return `/api/img?url=${encodeURIComponent(url)}`;
}

function getStableId(item: CollectionItem): string {
  return item.card_id ?? item.id ?? `${item.name}:${item.set_name ?? ""}:${item.number ?? ""}`;
}

function safeTypes(item: CollectionItem): string[] {
  return Array.isArray(item.types) ? item.types : [];
}

export default async function CollectionPage() {
  const res = await fetch(`${baseUrl()}/api/collection`, { cache: "no-store" });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    return (
      <div style={wrap}>
        <div style={glow} aria-hidden="true" />
        <div style={{ maxWidth: 1040, margin: "0 auto", position: "relative" }}>
          <header style={topbar}>
            <div>
              <div style={eyebrow}>Tracker</div>
              <h1 style={h1}>Collection</h1>
              <div style={sub}>Your saved cards</div>
            </div>
            <TopNav active="collection" />
          </header>

          <div style={{ ...panel, padding: 16, marginTop: 14 }}>
            <div style={{ fontWeight: 900 }}>Couldn’t load collection</div>
            <div style={{ opacity: 0.7, marginTop: 6, fontSize: 13 }}>
              {text ? text : "API request failed."}
            </div>
            <div style={{ marginTop: 12 }}>
              <Link href="/" style={pillLink}>
                ← Back to search
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const json = (await res.json()) as { data: CollectionItem[] };
  const items: CollectionItem[] = Array.isArray(json?.data) ? json.data : [];

  const uniqueCards = items.length;

  const totalQty = items.reduce((acc, it) => acc + (Number.isFinite(it.qty) ? it.qty : 0), 0);

  const setNames = new Set<string>();
  for (const it of items) {
    if (it.set_name && it.set_name.trim()) setNames.add(it.set_name.trim());
  }
  const setsCount = setNames.size;

  const typeCounts = new Map<string, number>();
  for (const it of items) {
    const qty = Number.isFinite(it.qty) ? it.qty : 0;
    for (const t of safeTypes(it)) {
      const key = String(t);
      typeCounts.set(key, (typeCounts.get(key) ?? 0) + Math.max(1, qty));
    }
  }

  const topTypes = Array.from(typeCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([t]) => t);

  const statsLineParts: string[] = [
    `${uniqueCards} unique`,
    `${totalQty} total`,
    `${setsCount} set${setsCount === 1 ? "" : "s"}`,
    topTypes.length ? `Top types: ${topTypes.join(", ")}` : "Top types: —",
  ];

  const isEmpty = items.length === 0;

  return (
    <div style={wrap}>
      <div style={glow} aria-hidden="true" />

      <div style={{ maxWidth: 1040, margin: "0 auto", position: "relative" }}>
        <header style={topbar}>
          <div>
            <div style={eyebrow}>Tracker</div>
            <h1 style={h1}>Collection</h1>
            <div style={sub}>Your saved cards</div>
          </div>

          <TopNav active="collection" />
        </header>

        <div style={{ ...panel, padding: 14, marginTop: 14 }}>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <span style={statPill}>
              <span style={{ opacity: 0.7 }}>Unique</span>
              <span style={mono}>{uniqueCards}</span>
            </span>

            <span style={statPill}>
              <span style={{ opacity: 0.7 }}>Total Qty</span>
              <span style={mono}>{totalQty}</span>
            </span>

            <span style={statPill}>
              <span style={{ opacity: 0.7 }}>Sets</span>
              <span style={mono}>{setsCount}</span>
            </span>

            <span style={{ ...statPill, maxWidth: "100%" }}>
              <span style={{ opacity: 0.7 }}>Top Types</span>
              <span style={mono}>{topTypes.length ? topTypes.join(", ") : "—"}</span>
            </span>

            <div style={{ marginLeft: "auto", display: "flex", gap: 10 }}>
              <Link href="/" style={pillLink}>
                ← Search
              </Link>
              <Link href="/wishlist" style={pillLink}>
                Wishlist →
              </Link>
            </div>
          </div>

          <div style={{ marginTop: 10, fontSize: 12, opacity: 0.55 }}>
            {statsLineParts.join(" • ")}
          </div>
        </div>

        {/* List */}
        <main style={{ marginTop: 12 }}>
          {isEmpty ? (
            <div style={empty}>
              <div style={{ fontWeight: 900 }}>Your collection is empty</div>
              <div style={{ marginTop: 6, opacity: 0.7, fontSize: 13 }}>
                Search for a card and click <b>Add to Collection</b>.
              </div>
              <div style={{ marginTop: 12 }}>
                <Link href="/" style={pillLink}>
                  Go to search →
                </Link>
              </div>
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                gap: 12,
              }}
            >
              {items.map((it) => {
                const id = getStableId(it);
                const thumb = proxiedImage(it.image_small);

                const line = [it.set_name ?? "Unknown set", it.number ? `#${it.number}` : null]
                  .filter(Boolean)
                  .join(" • ");

                return (
                  <Link key={id} href={`/cards/${encodeURIComponent(id)}`} style={resultCard}>
                    <div style={thumbWrap}>
                      {thumb ? (
                        <img
                          src={thumb}
                          alt={it.name}
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
                          <div style={name} title={it.name}>
                            {it.name}
                          </div>
                          <div style={{ marginTop: 6, display: "flex", gap: 8, flexWrap: "wrap" }}>
                            <span style={badgeStrong}>Owned x{it.qty}</span>
                            {it.rarity ? <span style={badgeGhost}>{it.rarity}</span> : null}
                          </div>
                        </div>
                      </div>

                      <div style={metaLine}>{line}</div>

                      <div style={chips}>
                        {safeTypes(it).length ? (
                          safeTypes(it)
                            .slice(0, 4)
                            .map((t) => (
                              <span key={`${id}:${t}`} style={chip}>
                                {t}
                              </span>
                            ))
                        ) : (
                          <span style={{ ...chip, ...chipGhostStyle }}>No types</span>
                        )}
                        {safeTypes(it).length > 4 ? (
                          <span style={{ ...chip, ...chipGhostStyle }}>
                            +{safeTypes(it).length - 4}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </Link>
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

function baseUrl() {
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}


const wrap: React.CSSProperties = {
  minHeight: "100vh",
  background: "#070a10",
  color: "rgba(255,255,255,0.92)",
  padding: 24,
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

const panel: React.CSSProperties = {
  border: "1px solid rgba(255,255,255,0.12)",
  background: "rgba(0,0,0,0.28)",
  borderRadius: 18,
  boxShadow: "0 18px 60px rgba(0,0,0,0.22), inset 0 1px 0 rgba(255,255,255,0.05)",
  overflow: "hidden",
};

const pillLink: React.CSSProperties = {
  textDecoration: "none",
  color: "rgba(255,255,255,0.78)",
  fontSize: 13,
  padding: "8px 10px",
  borderRadius: 999,
  border: "1px solid rgba(255,255,255,0.12)",
  background: "rgba(0,0,0,0.18)",
};

const statPill: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 10,
  padding: "8px 10px",
  borderRadius: 999,
  fontSize: 12,
  border: "1px solid rgba(255,255,255,0.12)",
  background: "rgba(0,0,0,0.28)",
  backdropFilter: "blur(10px)",
  color: "rgba(255,255,255,0.82)",
  maxWidth: "100%",
};

const mono: React.CSSProperties = {
  fontFamily:
    'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

const empty: React.CSSProperties = {
  padding: 16,
  borderRadius: 18,
  border: "1px solid rgba(255,255,255,0.12)",
  background: "rgba(0,0,0,0.28)",
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
  background:
    "linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))",
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
  marginTop: 10,
  display: "flex",
  gap: 8,
  alignItems: "center",
  flexWrap: "wrap",
  fontSize: 13,
  opacity: 0.75,
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
