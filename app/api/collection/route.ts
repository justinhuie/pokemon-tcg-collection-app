import { NextResponse } from "next/server";
import { getDb, migrate } from "@/lib/db";

export const runtime = "nodejs";

type Row = {
  card_id: string;
  name: string;
  set_name: string | null;
  number: string | null;
  rarity: string | null;
  image_small: string | null;
  qty: number;
  updated_at: number | null;
  types_json: string | null;
};

export async function GET() {
  const db = getDb();
  migrate(db);

  try {
    const rows = db
      .prepare(
        `
        SELECT
          ci.card_id AS card_id,
          c.name,
          c.set_name,
          c.number,
          c.rarity,
          c.image_small,
          c.types_json,
          ci.qty,
          ci.updated_at
        FROM collection_items ci
        JOIN cards c ON c.id = ci.card_id
        ORDER BY ci.updated_at DESC;
      `
      )
      .all() as Row[];

    const data = rows.map((r) => ({
      card_id: r.card_id,
      name: r.name,
      set_name: r.set_name,
      number: r.number,
      rarity: r.rarity,
      image_small: r.image_small,
      qty: Number(r.qty ?? 0),
      updated_at: r.updated_at ?? undefined,
      types: r.types_json ? (JSON.parse(r.types_json) as string[]) : [],
    }));

    return NextResponse.json({ data });
  } finally {
    db.close();
  }
}
