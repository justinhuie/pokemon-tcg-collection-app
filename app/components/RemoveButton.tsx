"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function RemoveButton({
  endpoint,
  label = "Remove",
}: {
  endpoint: string;
  label?: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onRemove(e: React.MouseEvent<HTMLButtonElement>) {
    e.preventDefault();
    e.stopPropagation();

    if (loading) return;
    setLoading(true);
    setErr(null);

    try {
      console.log("[RemoveButton] DELETE", endpoint);

      const res = await fetch(endpoint, { method: "DELETE" });
      const text = await res.text();

      console.log("[RemoveButton] status", res.status, "body:", text);

      if (!res.ok) throw new Error(text || `HTTP ${res.status}`);

      router.refresh();
    } catch (e2: unknown) {
      setErr(e2 instanceof Error ? e2.message : "Remove failed");
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
