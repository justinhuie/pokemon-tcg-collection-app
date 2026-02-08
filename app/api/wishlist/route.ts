import { NextResponse } from "next/server";
import { getDb, migrate } from "@/lib/db";

export const runtime = "nodejs";

type UpsertBody = {
  cardId: string;
  priority?: number;
  notes?: string | null;
};

export async function GET() {
  const db = getDb();
  try {
    migrate(db);

    const rows = db
      .prepare(
        `
        SELECT
          c.id,
          c.name,
          c.set_name,
          c.number,
          c.rarity,
          c.image_small,
          wi.priority,
          wi.notes,
          wi.added_at
        FROM wishlist_items wi
        JOIN cards c ON c.id = wi.card_id
        ORDER BY wi.added_at DESC
        LIMIT 500;
      `
      )
      .all();

    return NextResponse.json({ data: rows });
  } finally {
    db.close();
  }
}

export async function POST(req: Request) {
  const body = (await req.json()) as UpsertBody;

  if (!body?.cardId || typeof body.cardId !== "string") {
    return NextResponse.json({ error: "cardId required" }, { status: 400 });
  }

  const priority =
    typeof body.priority === "number" ? Math.max(1, Math.min(5, Math.floor(body.priority))) : 2;

  const addedAt = Date.now();

  const db = getDb();
  try {
    migrate(db);

    db.prepare(
      `
      INSERT INTO wishlist_items (card_id, priority, notes, added_at)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(card_id) DO UPDATE SET
        priority = excluded.priority,
        notes = excluded.notes,
        added_at = excluded.added_at;
    `
    ).run(body.cardId, priority, body.notes ?? null, addedAt);

    return NextResponse.json({ data: { cardId: body.cardId, priority, addedAt } });
  } finally {
    db.close();
  }
}
