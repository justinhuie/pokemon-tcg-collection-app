"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  getOwnedQty,
  incrementOwned,
  isWishlisted,
  toggleWishlist,
  subscribeToStorageChange,
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
      <div style={btnRow}>
        <button
          type="button"
          onClick={() => incrementOwned(cardId, 1)}
          style={primaryBtn}
        >
          + Add to Collection
          {owned > 0 ? <span style={ownedBadge}>×{owned}</span> : null}
        </button>

        <button
          type="button"
          onClick={() => toggleWishlist(cardId)}
          style={{
            ...primaryBtn,
            borderColor: wish ? "rgba(124,92,255,0.55)" : "rgba(124,92,255,0.24)",
            background: wish ? "rgba(124,92,255,0.20)" : "rgba(124,92,255,0.08)",
          }}
        >
          {wish ? "★ Wishlisted" : "☆ Add to Wishlist"}
        </button>
      </div>

      <div style={btnRow}>
        <Link href="/collection" style={ghostLink}>
          View Collection →
        </Link>
        <Link href="/wishlist" style={ghostLink}>
          View Wishlist →
        </Link>
      </div>
    </div>
  );
}

const btnRow: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 10,
};

const primaryBtn: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  padding: "12px 14px",
  borderRadius: 14,
  border: "1px solid rgba(124,92,255,0.24)",
  background: "rgba(124,92,255,0.08)",
  color: "rgba(255,255,255,0.90)",
  cursor: "pointer",
  fontSize: 13,
  fontWeight: 700,
  boxShadow: "0 0 10px rgba(124,92,255,0.10)",
};

const ownedBadge: React.CSSProperties = {
  fontSize: 11,
  padding: "2px 7px",
  borderRadius: 999,
  background: "rgba(124,92,255,0.30)",
  border: "1px solid rgba(124,92,255,0.40)",
  color: "rgba(210,190,255,0.95)",
};

const ghostLink: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "10px 14px",
  borderRadius: 14,
  border: "1px solid rgba(255,255,255,0.12)",
  background: "rgba(255,255,255,0.04)",
  color: "rgba(255,255,255,0.65)",
  textDecoration: "none",
  fontSize: 13,
  textAlign: "center",
};
