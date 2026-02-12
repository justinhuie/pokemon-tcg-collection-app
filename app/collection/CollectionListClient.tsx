"use client";

import { useRouter } from "next/navigation";
import RemoveButton from "@/app/components/RemoveButton";

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
};

function proxiedImage(url: string | null): string | null {
  if (!url) return null;
  return `/api/img?url=${encodeURIComponent(url)}`;
}

function getStableId(item: CollectionItem): string {
  return (
    item.card_id ??
    item.id ??
    `${item.name}:${item.set_name ?? ""}:${item.number ?? ""}`
  );
}

function safeTypes(item: CollectionItem): string[] {
  return Array.isArray(item.types) ? item.types : [];
}

export default function CollectionListClient({
  items,
}: {
  items: CollectionItem[];
}) {
  const router = useRouter();

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
        gap: 12,
      }}
    >
      {items.map((it) => {
        const stableId = getStableId(it);

        const cardId: string = it.card_id ?? it.id ?? "";

        const thumb = proxiedImage(it.image_small);
        const line = [it.set_name ?? "Unknown set", it.number ? `#${it.number}` : null]
          .filter(Boolean)
          .join(" • ");

        const deleteEndpoint = cardId
          ? `/api/collection/${encodeURIComponent(cardId)}`
          : "";

        return (
          <div
            key={stableId}
            style={resultCardOuter}
            onClick={() => {
              if (cardId) router.push(`/cards/${encodeURIComponent(cardId)}`);
            }}
            role="button"
            tabIndex={0}
            aria-disabled={!cardId}
          >
            <div style={resultCardLink}>
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
                    <div
                      style={{
                        marginTop: 6,
                        display: "flex",
                        gap: 8,
                        flexWrap: "wrap",
                      }}
                    >
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
                        <span key={`${stableId}:${t}`} style={chip}>
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
            </div>

            <div
              style={actionsRow}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
            >
              {cardId ? (
                <RemoveButton endpoint={deleteEndpoint} label="Delete" />
              ) : (
                <span style={{ fontSize: 12, opacity: 0.6 }}>Missing card id</span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

const resultCardOuter: React.CSSProperties = {
  borderRadius: 18,
  border: "1px solid rgba(255,255,255,0.12)",
  background: "rgba(0,0,0,0.28)",
  boxShadow: "0 18px 60px rgba(0,0,0,0.22), inset 0 1px 0 rgba(255,255,255,0.05)",
  overflow: "hidden",
  cursor: "pointer",
};

const resultCardLink: React.CSSProperties = {
  display: "flex",
  gap: 14,
  padding: 14,
  color: "inherit",
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
  background: "linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))",
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
