import Link from "next/link";
import RemoveButton from "@/app/components/RemoveButton";
import TopNav from "@/app/components/TopNav";

type Row = {
  id: string;
  name: string;
  set_name: string | null;
  number: string | null;
  rarity: string | null;
  image_small: string | null;
  priority: number;
  added_at: number;
};

function proxiedImage(url: string | null) {
  if (!url) return null;
  return `/api/img?url=${encodeURIComponent(url)}`;
}

export default async function WishlistPage() {
  const res = await fetch(`${baseUrl()}/api/wishlist`, { cache: "no-store" });
  const json = (await res.json()) as { data: Row[] };
  const items = Array.isArray(json.data) ? json.data : [];

  return (
    <div style={wrap}>
      <div style={glow} aria-hidden="true" />

      <div style={shell}>
        <header style={topbar}>
          <div style={{ minWidth: 0 }}>
            <div style={eyebrow}>Targets</div>
            <h1 style={h1}>My Wishlist</h1>
            <div style={sub}>{items.length} item(s)</div>
          </div>

          <TopNav active="wishlist" />
        </header>

        <main style={{ marginTop: 16 }}>
          {items.length === 0 ? (
            <div style={panel}>
              <div style={{ fontWeight: 900, fontSize: 16 }}>
                No wishlist items
              </div>
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
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={thumb}
                            alt={c.name}
                            width={80}
                            height={112}
                            style={thumbImg}
                            loading="lazy"
                          />
                        ) : (
                          <span style={{ opacity: 0.6, fontSize: 12 }}>
                            No image
                          </span>
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
                      </div>
                    </Link>

                    <div style={actionsRow}>
                      <RemoveButton
                        endpoint={`/api/wishlist/${encodeURIComponent(c.id)}`}
                        label="Remove"
                      />
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

function baseUrl() {
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
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
