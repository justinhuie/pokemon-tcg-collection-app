// app/api/search-cards/route.ts
//
// Card search backed by SQLite: FTS5 for text, indexed columns for filters,
// and ORDER BY / LIMIT / OFFSET for sorting and pagination. Only the requested
// page of rows is materialized in JavaScript.
import { NextResponse } from "next/server";
import { searchCatalog, type CatalogSort } from "@/lib/db";

export const runtime = "nodejs";

const PAGE_SIZE_DEFAULT = 30;
const SORTS: readonly CatalogSort[] = ["name", "set", "rarity", "number"];

type SearchCard = {
  id: string;
  name: string;
  supertype: string | null;
  set_id: string | null;
  set_name: string | null;
  number: string | null;
  rarity: string | null;
  types: string[];
  image_small: string | null;
  image_large: string | null;
  owned_qty: number;
  wishlisted: boolean;
};

function clampInt(n: number, min: number, max: number): number {
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, Math.floor(n)));
}

function parseTypes(json: string | null): string[] {
  if (!json) return [];
  try {
    const v: unknown = JSON.parse(json);
    return Array.isArray(v)
      ? v.filter((t): t is string => typeof t === "string" && t.trim() !== "").map((t) => t.trim())
      : [];
  } catch {
    return [];
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  const qRaw = (searchParams.get("q") ?? "").trim();
  const q = qRaw.length >= 2 ? qRaw.replace(/\s+/g, " ") : "";

  const limit = clampInt(Number(searchParams.get("limit") ?? String(PAGE_SIZE_DEFAULT)), 1, 60);
  const page = clampInt(Number(searchParams.get("page") ?? "1"), 1, 10_000);

  const set = (searchParams.get("set") ?? "").trim();
  const rarity = (searchParams.get("rarity") ?? "").trim();
  const type = (searchParams.get("type") ?? "").trim();

  // owned / wishlisted live in the browser's localStorage and are filtered client-side.

  const sortRaw = (searchParams.get("sort") ?? "").trim() as CatalogSort;
  const sort: CatalogSort = SORTS.includes(sortRaw) ? sortRaw : "name";

  try {
    const rows = searchCatalog({
      q,
      set,
      rarity,
      type,
      sort,
      limit,
      offset: (page - 1) * limit,
    });

    const data: SearchCard[] = rows.map((r) => ({
      id: r.id,
      name: r.name,
      supertype: r.supertype,
      set_id: r.set_id,
      set_name: r.set_name,
      number: r.number,
      rarity: r.rarity,
      types: parseTypes(r.types_json),
      image_small: r.image_small,
      image_large: r.image_large,
      owned_qty: 0,
      wishlisted: false,
    }));

    return NextResponse.json({ data });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Search failed";
    return new NextResponse(msg, { status: 500 });
  }
}
