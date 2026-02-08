"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function RemoveButton({
  endpoint,
  label = "Remove",
}: {
  endpoint: string; // e.g. /api/collection/<id> or /api/wishlist/<id>
  label?: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onRemove() {
    if (loading) return;
    setLoading(true);
    setErr(null);

    try {
      const res = await fetch(endpoint, { method: "DELETE" });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `HTTP ${res.status}`);
      }

      // Re-render the server page list
      router.refresh();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Remove failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ display: "grid", gap: 6 }}>
      <button
        type="button"
        onClick={onRemove}
        disabled={loading}
        style={{
          padding: "8px 10px",
          borderRadius: 12,
          border: "1px solid rgba(255,255,255,0.14)",
          background: "rgba(255,255,255,0.04)",
          color: "rgba(255,255,255,0.82)",
          cursor: loading ? "not-allowed" : "pointer",
          transition: "transform 140ms ease, background 140ms ease, border-color 140ms ease",
        }}
        onMouseEnter={(e) => {
          if (loading) return;
          e.currentTarget.style.background = "rgba(255,120,120,0.10)";
          e.currentTarget.style.borderColor = "rgba(255,120,120,0.30)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "rgba(255,255,255,0.04)";
          e.currentTarget.style.borderColor = "rgba(255,255,255,0.14)";
        }}
        title="Remove this item"
      >
        {loading ? "Removing…" : label}
      </button>

      {err ? (
        <div style={{ fontSize: 12, color: "rgba(255,160,160,0.95)" }}>
          {err}
        </div>
      ) : null}
    </div>
  );
}
