import Link from "next/link";

type Tab = "search" | "scan" | "collection" | "wishlist";

export default function TopNav({ active }: { active: Tab }) {
  return (
    <nav style={nav}>
      <Link href="/" style={{ ...pill, ...(active === "search" ? pillActive : null) }}>
        Search
      </Link>
      <Link
        href="/collection"
        style={{ ...pill, ...(active === "collection" ? pillActive : null) }}
      >
        Collection
      </Link>
      <Link
        href="/wishlist"
        style={{ ...pill, ...(active === "wishlist" ? pillActive : null) }}
      >
        Wishlist
      </Link>
    </nav>
  );
}

const nav: React.CSSProperties = {
  display: "flex",
  gap: 10,
  flexWrap: "wrap",
  justifyContent: "flex-end",
};

const pill: React.CSSProperties = {
  textDecoration: "none",
  color: "rgba(255,255,255,0.82)",
  fontSize: 13,
  padding: "8px 10px",
  borderRadius: 999,
  border: "1px solid rgba(255,255,255,0.12)",
  background: "rgba(0,0,0,0.28)",
};

const pillActive: React.CSSProperties = {
  borderColor: "rgba(124,92,255,0.45)",
  background: "rgba(124,92,255,0.14)",
};
