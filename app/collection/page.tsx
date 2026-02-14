import Link from "next/link";
import TopNav from "@/app/components/TopNav";
import CollectionListClient from "./CollectionListClient";

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

export default async function CollectionPage() {
  const res = await fetch(`${baseUrl()}/api/collection`, { cache: "no-store" });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    return (
      <div style={wrap}>
        <div style={glow} aria-hidden="true" />

        <div style={shell}>
          <header style={topbar}>
            <div style={{ minWidth: 0 }}>
              <div style={eyebrow}>Tracker</div>
              <h1 style={h1}>Collection</h1>
              <div style={sub}>Couldn’t load</div>
            </div>
            <TopNav active="collection" />
          </header>

          <main style={{ marginTop: 16 }}>
            <div style={panel}>
              <div style={{ fontWeight: 900, fontSize: 16 }}>
                Couldn’t load collection
              </div>
              <div style={{ opacity: 0.7, marginTop: 6, fontSize: 14 }}>
                {text || "API request failed."}
              </div>
              <div style={{ marginTop: 12 }}>
                <Link href="/" style={ctaLink}>
                  Go to Search →
                </Link>
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  const json = (await res.json()) as { data: CollectionItem[] };
  const items = Array.isArray(json?.data) ? json.data : [];

  return (
    <div style={wrap}>
      <div style={glow} aria-hidden="true" />

      <div style={shell}>
        <header style={topbar}>
          <div style={{ minWidth: 0 }}>
            <div style={eyebrow}>Tracker</div>
            <h1 style={h1}>Collection</h1>
            <div style={sub}>{items.length} item(s)</div>
          </div>

          <TopNav active="collection" />
        </header>

        <main style={{ marginTop: 16 }}>
          {items.length === 0 ? (
            <div style={panel}>
              <div style={{ fontWeight: 900, fontSize: 16 }}>
                No collection items
              </div>
              <div style={{ opacity: 0.7, marginTop: 6, fontSize: 14 }}>
                Add cards you own to track quantity and progress.
              </div>
              <div style={{ marginTop: 12 }}>
                <Link href="/" style={ctaLink}>
                  Go to Search →
                </Link>
              </div>
            </div>
          ) : (
            <CollectionListClient items={items} />
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
