import Image from "next/image";
import Link from "next/link";
import CardActions from "@/app/components/CardActions";

type CardDetail = {
  id: string;
  name: string;
  set_id: string | null;
  set_name: string | null;
  number: string | null;
  rarity: string | null;
  types: string[];
  images: { small: string | null; large: string | null };
};

export default async function CardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const detailRes = await fetch(`${baseUrl()}/api/cards/${id}/detail`, {
    cache: "no-store",
  });

  if (!detailRes.ok) {
    return (
      <div style={wrap}>
        <div style={glow} aria-hidden="true" />
        <div style={shell}>
          <Link href="/" style={back}>
            ← Back
          </Link>
          <div style={{ ...panel, padding: 16, marginTop: 14 }}>
            <div style={{ fontWeight: 800, fontSize: 16 }}>Card not found</div>
            <div style={{ opacity: 0.7, marginTop: 6 }}>
              This ID doesn’t exist in your local catalog.
            </div>
          </div>
        </div>
      </div>
    );
  }

  const detailJson = (await detailRes.json()) as { data: CardDetail };
  const card = detailJson.data;

  const large = card.images?.large
    ? `/api/img?url=${encodeURIComponent(card.images.large)}`
    : null;

  const setLine = [
    card.set_name ?? "Unknown set",
    card.number ? `#${card.number}` : null,
    card.rarity ?? "Unknown rarity",
  ]
    .filter(Boolean)
    .join(" • ");

  return (
    <div style={wrap}>
      <div style={glow} aria-hidden="true" />

      <div style={shell}>
        <div style={topRow}>
          <Link href="/" style={back}>
            ← Back to search
          </Link>

          <div style={{ display: "flex", gap: 10 }}>
            <Link href="/collection" style={pillLink}>
              Collection
            </Link>
            <Link href="/wishlist" style={pillLink}>
              Wishlist
            </Link>
          </div>
        </div>

        <div style={{ marginTop: 14 }}>
          <h1 style={title}>{card.name}</h1>
          <div style={subtitle}>{setLine}</div>

          <div style={typeRow}>
            {card.types?.length ? (
              card.types.map((t) => (
                <span key={t} style={chip}>
                  {t}
                </span>
              ))
            ) : (
              <span style={{ ...chip, opacity: 0.6 }}>No types</span>
            )}
          </div>
        </div>

        <div style={grid}>
          <section style={panel}>
            <div style={imageArea}>
              {large ? (
                <Image
                  src={large}
                  alt={card.name}
                  width={364}
                  height={504}
                  unoptimized
                  priority
                  style={cardImg}
                />
              ) : (
                <div style={{ opacity: 0.7, padding: 20 }}>No image available</div>
              )}
            </div>
          </section>

          {/* RIGHT: details + add buttons */}
          <aside style={{ display: "grid", gap: 14, alignContent: "start" }}>
            <div style={panel}>
              <div style={{ padding: 18 }}>
                <div style={sectionTitle}>Details</div>

                <Row k="Set" v={card.set_name ?? "—"} />
                <Row k="Number" v={card.number ?? "—"} />
                <Row k="Rarity" v={card.rarity ?? "—"} />
                <Row k="Types" v={card.types?.length ? card.types.join(", ") : "—"} />
              </div>
            </div>

            <div style={panel}>
              <div style={{ padding: 18 }}>
                <div style={sectionTitle}>Actions</div>

                {/* CardActions should only render Add buttons now */}
                <CardActions cardId={id} />
              </div>
            </div>
          </aside>
        </div>

        <div style={{ height: 60 }} />
      </div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div style={row}>
      <div style={{ fontSize: 12, opacity: 0.6 }}>{k}</div>
      <div style={rowVal}>{v}</div>
    </div>
  );
}

function baseUrl() {
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}

/* ===== Styles ===== */

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

const topRow: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12,
};

const back: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  textDecoration: "none",
  color: "rgba(255,255,255,0.72)",
  fontSize: 13,
  padding: "8px 10px",
  borderRadius: 12,
  border: "1px solid rgba(255,255,255,0.12)",
  background: "rgba(0,0,0,0.22)",
  backdropFilter: "blur(10px)",
};

const title: React.CSSProperties = {
  margin: 0,
  fontSize: 34,
  fontWeight: 900,
  letterSpacing: "-0.02em",
};

const subtitle: React.CSSProperties = {
  opacity: 0.7,
  marginTop: 8,
  fontSize: 14,
};

const typeRow: React.CSSProperties = {
  display: "flex",
  gap: 8,
  flexWrap: "wrap",
  marginTop: 12,
};

const panel: React.CSSProperties = {
  border: "1px solid rgba(255,255,255,0.12)",
  background: "rgba(0,0,0,0.28)",
  borderRadius: 18,
  boxShadow:
    "0 18px 60px rgba(0,0,0,0.22), inset 0 1px 0 rgba(255,255,255,0.05)",
  overflow: "hidden",
};

const grid: React.CSSProperties = {
  marginTop: 16,
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) 420px",
  gap: 16,
  alignItems: "start",
};

const mediaHack = `
@media (max-width: 980px) {
  .__grid { grid-template-columns: 1fr; }
}
`;

const imageArea: React.CSSProperties = {
  padding: 12,
  display: "grid",
  placeItems: "center",
};

const cardImg: React.CSSProperties = {
  borderRadius: 18,
  border: "1px solid rgba(255,255,255,0.10)",
  boxShadow: "0 24px 60px rgba(0,0,0,0.45)",
  height: "auto",
  width: "100%",
  maxWidth: "460px",
  display: "block"
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

const chip: React.CSSProperties = {
  fontSize: 12,
  padding: "6px 10px",
  borderRadius: 999,
  border: "1px solid rgba(255,255,255,0.12)",
  background: "rgba(0,0,0,0.25)",
  color: "rgba(255,255,255,0.72)",
};

const sectionTitle: React.CSSProperties = {
  fontWeight: 850,
  marginBottom: 12,
  fontSize: 14,
  opacity: 0.92,
};

const row: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  padding: "12px 14px",
  borderRadius: 14,
  border: "1px solid rgba(255,255,255,0.10)",
  background: "rgba(255,255,255,0.03)",
  marginTop: 10,
};

const rowVal: React.CSSProperties = {
  fontSize: 13,
  opacity: 0.88,
  textAlign: "right",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};
