"use client";

import Link from "next/link";
import { useState } from "react";

export default function CardActions({ cardId }: { cardId: string }) {
  const [addingCollection, setAddingCollection] = useState(false);
  const [addingWishlist, setAddingWishlist] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function addToCollection() {
    if (addingCollection) return;
    setAddingCollection(true);
    setMsg(null);

    try {
      const res = await fetch(`/api/collection/${encodeURIComponent(cardId)}`, {
        method: "POST",
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `HTTP ${res.status}`);
      }

      setMsg("Added to collection.");
    } catch (e: unknown) {
      setMsg(e instanceof Error ? e.message : "Failed to add to collection.");
    } finally {
      setAddingCollection(false);
    }
  }

  async function addToWishlist() {
    if (addingWishlist) return;
    setAddingWishlist(true);
    setMsg(null);

    try {
      const res = await fetch(`/api/wishlist/${encodeURIComponent(cardId)}`, {
        method: "POST",
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `HTTP ${res.status}`);
      }

      setMsg("Added to wishlist.");
    } catch (e: unknown) {
      setMsg(e instanceof Error ? e.message : "Failed to add to wishlist.");
    } finally {
      setAddingWishlist(false);
    }
  }

  return (
    <div style={{ display: "grid", gap: 10 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <button
          type="button"
          onClick={addToCollection}
          disabled={addingCollection}
          style={{
            padding: "10px 12px",
            borderRadius: 14,
            border: "1px solid rgba(255,255,255,0.14)",
            background: addingCollection
              ? "rgba(255,255,255,0.06)"
              : "rgba(0,0,0,0.22)",
            color: "rgba(255,255,255,0.88)",
            cursor: addingCollection ? "not-allowed" : "pointer",
            backdropFilter: "blur(10px)",
            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.05)",
          }}
          title="Adds this card to your local collection"
        >
          {addingCollection ? "Adding…" : "Add to Collection"}
        </button>

        <button
          type="button"
          onClick={addToWishlist}
          disabled={addingWishlist}
          style={{
            padding: "10px 12px",
            borderRadius: 14,
            border: "1px solid rgba(255,255,255,0.14)",
            background: addingWishlist
              ? "rgba(255,255,255,0.06)"
              : "rgba(0,0,0,0.22)",
            color: "rgba(255,255,255,0.88)",
            cursor: addingWishlist ? "not-allowed" : "pointer",
            backdropFilter: "blur(10px)",
            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.05)",
          }}
          title="Adds this card to your wishlist"
        >
          {addingWishlist ? "Adding…" : "Add to Wishlist"}
        </button>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
        <Link
          href="/collection"
          style={{
            textDecoration: "none",
            color: "rgba(255,255,255,0.72)",
            fontSize: 13,
            padding: "8px 10px",
            borderRadius: 999,
            border: "1px solid rgba(255,255,255,0.12)",
            background: "rgba(0,0,0,0.18)",
          }}
        >
          View Collection →
        </Link>

        <Link
          href="/wishlist"
          style={{
            textDecoration: "none",
            color: "rgba(255,255,255,0.72)",
            fontSize: 13,
            padding: "8px 10px",
            borderRadius: 999,
            border: "1px solid rgba(255,255,255,0.12)",
            background: "rgba(0,0,0,0.18)",
          }}
        >
          View Wishlist →
        </Link>
      </div>

      {msg ? (
        <div
          style={{
            fontSize: 13,
            color: "rgba(255,255,255,0.75)",
            padding: "10px 12px",
            borderRadius: 14,
            border: "1px solid rgba(255,255,255,0.10)",
            background: "rgba(255,255,255,0.04)",
          }}
        >
          {msg}
        </div>
      ) : null}
    </div>
  );
}
