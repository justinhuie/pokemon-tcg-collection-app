"use client";

import { useRouter } from "next/navigation";
import RemoveButton from "@/app/components/RemoveButton";

type WishlistItem = {
  id: string;
  name: string;
  set_name: string | null;
  number: string | null;
  rarity: string | null;
  image_small: string | null;
  priority: number;
  added_at: number;
};

function proxiedImage(url: string | null): string | null {
  if (!url) return null;
  return `/api/img?url=${encodeURIComponent(url)}`;
}

export default function WishlistListClient({ items }: { items: WishlistItem[] }) {
  const router = useRouter();

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
        gap: 12,
      }}
    >
      {items.map((it) => {
        const cardId = it.id;
        const thumb = proxiedImage(it.image_small);

        const line = [
          it.set_name ?? "Unknown set",
          it.number ? `#${it.number}` : null,
        ]
          .filter(Boolean)
          .join(" • ");

        const deleteEndpoint = `/api/wishlist/${encodeURIComponent(cardId)}`;

        return (
          <div
            key={cardId}
            style={resultCardOuter}
            onClick={() => router.push(`/cards/${encodeURIComponent(cardId)}`)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                router.push(`/cards/${encodeURIComponent(cardId)}`);
              }
            }}
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
                      {it.rarity ? (
                        <span style={badgeGhost}>{it.rarity}</span>
                      ) : (
                        <span style={badgeGhost}>Wishlist</span>
                      )}
                    </div>
                  </div>
                </div>

                <div style={metaLine}>{line}</div>

                <div style={chips}>
                  <span style={{ ...chip, ...chipGhostStyle }}>
                    Priority {it.priority}
                  </span>
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
              <RemoveButton endpoint={deleteEndpoint} label="Remove" />
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
  boxShadow:
    "0 18px 60px rgba(0,0,0,0.22), inset 0 1px 0 rgba(255,255,255,0.05)",
  overflow: "hidden",
  cursor: "pointer",
  minWidth: 0,
};

const resultCardLink: React.CSSProperties = {
  display: "flex",
  gap: 14,
  padding: 14,
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
