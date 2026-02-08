import { NextResponse } from "next/server";
import { getDb, migrate } from "@/lib/db";

export const runtime = "nodejs";

type SearchRow = {
  id: string;
  name: string;
  set_id: string | null;
  set_name: string | null;
  number: string | null;
  rarity: string | null;
  types_json: string | null;
  image_small: string | null;
  image_large: string | null;
  owned_qty: number;
  wishlisted: number; // 0/1 in SQL
};

function normalizeFts(q: string): string {
  const cleaned = q
    .trim()
    .replace(/["']/g, " ")
    .replace(/[^\p{L}\p{N}\s-]/gu, " ")
    .replace(/\s+/g, " ");

  if (!cleaned) return "";
  return cleaned
    .split(" ")
    .filter(Boolean)
    .map((t) => `${t}*`)
    .join(" ");
}

function clampInt(n: number, min: number, max: number): number {
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, Math.floor(n)));
}

function typesJsonHas(type: string): string {
  return `%\"${type}\"%`;
}

function likeContains(s: string): string {
  return `%${s}%`;
}

// Heuristic: many set ids look like "sv3pt5", "base1", etc (letters+digits-ish, short).
function looksLikeSetId(s: string): boolean {
  const v = s.trim();
  if (!v) return false;
  if (v.length > 20) return false;
  return /^[a-z0-9]+$/i.test(v);
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  const qRaw = (searchParams.get("q") ?? "").trim();
  const q = qRaw.length >= 2 ? qRaw : "";

  const limit = clampInt(Number(searchParams.get("limit") ?? "30"), 1, 60);
  const page = clampInt(Number(searchParams.get("page") ?? "1"), 1, 10_000);
  const offset = (page - 1) * limit;

  const set = (searchParams.get("set") ?? "").trim(); // can be set_id OR name OR "151"
  const rarity = (searchParams.get("rarity") ?? "").trim();
  const type = (searchParams.get("type") ?? "").trim();

  const owned = (searchParams.get("owned") ?? "") === "1";
  const wishlisted = (searchParams.get("wishlisted") ?? "") === "1";

  const sort = (searchParams.get("sort") ?? "").trim(); // "name" | "set" | "rarity" | "number" | "relevance"

  const db = getDb();
  migrate(db);

  try {
    const args: Array<string | number> = [];
    const where: string[] = [];

    // ✅ SET filter: accept either set_id OR set_name OR substring (like "151")
    if (set) {
      if (looksLikeSetId(set)) {
        // if they passed the real id (sv3pt5), match it
        where.push("(c.set_id = ? OR c.set_name = ? OR c.set_name LIKE ?)");
        args.push(set, set, likeContains(set));
      } else {
        // if they passed "151" or full name, match name equals or contains
        where.push("(c.set_name = ? OR c.set_name LIKE ? OR c.set_id = ?)");
        args.push(set, likeContains(set), set);
      }
    }

    if (rarity) {
      where.push("c.rarity = ?");
      args.push(rarity);
    }
    if (type) {
      where.push("c.types_json LIKE ?");
      args.push(typesJsonHas(type));
    }
    if (owned) {
      where.push("COALESCE(ci.qty, 0) > 0");
    }
    if (wishlisted) {
      where.push("wi.card_id IS NOT NULL");
    }

    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

    // ORDER BY (stable!)
    let orderBy = "ORDER BY c.name ASC, c.id ASC";

    if (q) {
      if (sort === "" || sort === "relevance") {
        orderBy = "ORDER BY bm25(f) ASC, c.name ASC, c.id ASC";
      } else if (sort === "name") {
        orderBy = "ORDER BY c.name ASC, c.id ASC";
      } else if (sort === "set") {
        orderBy = "ORDER BY c.set_name ASC, c.name ASC, c.id ASC";
      } else if (sort === "rarity") {
        orderBy = "ORDER BY c.rarity ASC, c.name ASC, c.id ASC";
      } else if (sort === "number") {
        orderBy = "ORDER BY c.number ASC, c.name ASC, c.id ASC";
      }
    } else {
      if (sort === "set") {
        orderBy = "ORDER BY c.set_name ASC, c.name ASC, c.id ASC";
      } else if (sort === "rarity") {
        orderBy = "ORDER BY c.rarity ASC, c.name ASC, c.id ASC";
      } else if (sort === "number") {
        orderBy = "ORDER BY c.number ASC, c.name ASC, c.id ASC";
      } else {
        orderBy = "ORDER BY c.name ASC, c.id ASC";
      }
    }

    let rows: SearchRow[] = [];

    if (q) {
      const fts = normalizeFts(q);
      if (!fts) return NextResponse.json({ data: [] });

      const stmt = db.prepare(`
        SELECT
          c.id,
          c.name,
          c.set_id,
          c.set_name,
          c.number,
          c.rarity,
          c.types_json,
          c.image_small,
          c.image_large,
          COALESCE(ci.qty, 0) AS owned_qty,
          CASE WHEN wi.card_id IS NULL THEN 0 ELSE 1 END AS wishlisted
        FROM cards_fts f
        JOIN cards c ON c.id = f.id
        LEFT JOIN collection_items ci ON ci.card_id = c.id
        LEFT JOIN wishlist_items wi ON wi.card_id = c.id
        ${whereSql ? `${whereSql} AND cards_fts MATCH ?` : "WHERE cards_fts MATCH ?"}
        ${orderBy}
        LIMIT ? OFFSET ?;
      `);

      rows = stmt.all(...args, fts, limit, offset) as SearchRow[];
    } else {
      const stmt = db.prepare(`
        SELECT
          c.id,
          c.name,
          c.set_id,
          c.set_name,
          c.number,
          c.rarity,
          c.types_json,
          c.image_small,
          c.image_large,
          COALESCE(ci.qty, 0) AS owned_qty,
          CASE WHEN wi.card_id IS NULL THEN 0 ELSE 1 END AS wishlisted
        FROM cards c
        LEFT JOIN collection_items ci ON ci.card_id = c.id
        LEFT JOIN wishlist_items wi ON wi.card_id = c.id
        ${whereSql}
        ${orderBy}
        LIMIT ? OFFSET ?;
      `);

      rows = stmt.all(...args, limit, offset) as SearchRow[];
    }

    const data = rows.map((r) => ({
      id: r.id,
      name: r.name,
      set_id: r.set_id,
      set_name: r.set_name,
      number: r.number,
      rarity: r.rarity,
      types: r.types_json ? (JSON.parse(r.types_json) as string[]) : [],
      image_small: r.image_small,
      image_large: r.image_large,
      owned_qty: Number(r.owned_qty ?? 0),
      wishlisted: Boolean(r.wishlisted),
    }));

    return NextResponse.json({ data });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Search failed";
    return new NextResponse(msg, { status: 500 });
  } finally {
    db.close();
  }
}
