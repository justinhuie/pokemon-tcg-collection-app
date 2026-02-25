"use client";

import { useEffect, useMemo, useState } from "react";
import {
  getOwnedQty,
  incrementOwned,
  isWishlisted,
  toggleWishlist,
  subscribeToStorageChange,
  setOwnedQty,
} from "@/lib/tcgStorage";

export default function CardActions({ cardId }: { cardId: string }) {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    return subscribeToStorageChange(() => setTick((x) => x + 1));
  }, []);

  const owned = useMemo(() => getOwnedQty(cardId), [cardId, tick]);
  const wish = useMemo(() => isWishlisted(cardId), [cardId, tick]);

  return (
    <div style={{ display: "grid", gap: 10 }}>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <button
          type="button"
          onClick={() => toggleWishlist(cardId)}
          style={{
            ...btn,
            borderColor: wish ? "rgba(255,255,255,0.22)" : "rgba(255,255,255,0.14)",
            background: wish ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.18)",
          }}
        >
          {wish ? "★ Wishlisted" : "☆ Add to Wishlist"}
        </button>

        <button type="button" onClick={() => incrementOwned(cardId, 1)} style={btn}>
          + Add to Collection
        </button>
      </div>

      <div style={panelRow}>
        <div style={{ opacity: 0.7, fontSize: 13 }}>Owned</div>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button
            type="button"
            onClick={() => incrementOwned(cardId, -1)}
            disabled={owned <= 0}
            style={{ ...miniBtn, opacity: owned <= 0 ? 0.5 : 1 }}
          >
            −
          </button>

          <div style={{ minWidth: 40, textAlign: "center", fontWeight: 800 }}>
            {owned}
          </div>

          <button type="button" onClick={() => incrementOwned(cardId, 1)} style={miniBtn}>
            +
          </button>

          <button
            type="button"
            onClick={() => setOwnedQty(cardId, 0)}
            disabled={owned <= 0}
            style={{ ...ghostBtn, opacity: owned <= 0 ? 0.5 : 1 }}
          >
            Clear
          </button>
        </div>
      </div>

      <div style={{ fontSize: 12, opacity: 0.55 }}>
        Saved locally in your browser (localStorage).
      </div>
    </div>
  );
}

const btn: React.CSSProperties = {
  padding: "10px 12px",
  borderRadius: 14,
  border: "1px solid rgba(255,255,255,0.14)",
  background: "rgba(0,0,0,0.18)",
  color: "rgba(255,255,255,0.88)",
  cursor: "pointer",
};

const panelRow: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12,
  padding: 12,
  borderRadius: 14,
  border: "1px solid rgba(255,255,255,0.10)",
  background: "rgba(255,255,255,0.03)",
};

const miniBtn: React.CSSProperties = {
  width: 34,
  height: 34,
  borderRadius: 12,
  border: "1px solid rgba(255,255,255,0.14)",
  background: "rgba(0,0,0,0.18)",
  color: "rgba(255,255,255,0.88)",
  cursor: "pointer",
};

const ghostBtn: React.CSSProperties = {
  padding: "8px 10px",
  borderRadius: 12,
  border: "1px solid rgba(255,255,255,0.12)",
  background: "transparent",
  color: "rgba(255,255,255,0.70)",
  cursor: "pointer",
};