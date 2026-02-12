import { NextResponse } from "next/server";
import { getDb, migrate } from "@/lib/db";

export const runtime = "nodejs";

type WishlistRow = {
  id: string; 
  name: string;
  set_name: string | null;
  number: string | null;
  rarity: string | null;
  image_small: string | null;
  priority: number;
  added_at: number;
};

export async function GET() {
  const db = getDb();
  try {
    migrate(db);

    try {
      const rows = db
        .prepare(
          `
          SELECT
            c.id AS id,
            c.name AS name,
            c.set_name AS set_name,
            c.number AS number,
            c.rarity AS rarity,
            c.image_small AS image_small,
            COALESCE(wi.priority, 0) AS priority,
            COALESCE(wi.added_at, 0) AS added_at
          FROM wishlist_items wi
          JOIN cards c ON c.id = wi.card_id
          ORDER BY wi.priority DESC, wi.added_at DESC, c.name ASC;
        `
        )
        .all() as WishlistRow[];

      return NextResponse.json({ data: rows });
    } catch {
      const rows = db
        .prepare(
          `
          SELECT
            c.id AS id,
            c.name AS name,
            c.set_name AS set_name,
            c.number AS number,
            c.rarity AS rarity,
            c.image_small AS image_small,
            0 AS priority,
            0 AS added_at
          FROM wishlist_items wi
          JOIN cards c ON c.id = wi.card_id
          ORDER BY c.name ASC;
        `
        )
        .all() as WishlistRow[];

      return NextResponse.json({ data: rows });
    }
  } finally {
    db.close();
  }
}
