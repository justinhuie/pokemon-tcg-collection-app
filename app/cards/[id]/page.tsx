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
        <div style={{ maxWidth: 980, margin: "0 auto", position: "relative" }}>
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

      <div style={{ maxWidth: 980, margin: "0 auto", position: "relative" }}>
        <Link href="/" style={back}>
          ← Back to search
        </Link>

        <div
          style={{
            marginTop: 14,
            display: "flex",
            gap: 12,
            flexWrap: "wrap",
            alignItems: "baseline",
          }}
        >
          <h1
            style={{
              margin: 0,
              fontSize: 28,
              fontWeight: 850,
              letterSpacing: "-0.02em",
            }}
          >
            {card.name}
          </h1>

          {/* ✅ removed the id pill */}

          <div style={{ marginLeft: "auto", display: "flex", gap: 10 }}>
            <Link href="/collection" style={pillLink}>
              Collection
            </Link>
            <Link href="/wishlist" style={pillLink}>
              Wishlist
            </Link>
          </div>
        </div>

        <div style={{ opacity: 0.7, marginTop: 8 }}>{setLine}</div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
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

        <div
          style={{
            marginTop: 14,
            display: "grid",
            gridTemplateColumns: "1fr 360px",
            gap: 14,
          }}
        >
          <section style={panel}>
            <div style={{ padding: 14, display: "grid", placeItems: "center" }}>
              {large ? (
                <Image
                  src={large}
                  alt={card.name}
                  width={420}
                  height={585}
                  unoptimized
                  priority
                  style={{
                    borderRadius: 16,
                    border: "1px solid rgba(255,255,255,0.10)",
                    boxShadow: "0 28px 90px rgba(0,0,0,0.45)",
                    height: "auto",
                    maxWidth: "100%",
                  }}
                />
              ) : (
                <div style={{ opacity: 0.7, padding: 20 }}>No image available</div>
              )}
            </div>

            <div style={{ padding: 14, borderTop: "1px solid rgba(255,255,255,0.08)" }}>
              <CardActions cardId={id} />
            </div>
          </section>

          <aside style={panel}>
            <div style={{ padding: 16 }}>
              <div style={{ fontWeight: 800, marginBottom: 12 }}>Details</div>

              <Row k="Set" v={card.set_name ?? "—"} />
              <Row k="Number" v={card.number ?? "—"} />
              <Row k="Rarity" v={card.rarity ?? "—"} />
              <Row k="Types" v={card.types?.length ? card.types.join(", ") : "—"} />
            </div>
          </aside>
        </div>

        <div style={{ height: 24 }} />
      </div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        gap: 12,
        padding: "10px 12px",
        borderRadius: 14,
        border: "1px solid rgba(255,255,255,0.10)",
        background: "rgba(255,255,255,0.03)",
        marginTop: 10,
      }}
    >
      <div style={{ fontSize: 12, opacity: 0.6 }}>{k}</div>
      <div
        style={{
          fontSize: 13,
          opacity: 0.88,
          textAlign: "right",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {v}
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

const chip: React.CSSProperties = {
  fontSize: 12,
  padding: "6px 10px",
  borderRadius: 999,
  border: "1px solid rgba(255,255,255,0.12)",
  background: "rgba(0,0,0,0.25)",
  color: "rgba(255,255,255,0.72)",
};
