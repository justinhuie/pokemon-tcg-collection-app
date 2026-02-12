import { NextResponse } from "next/server";
import { getDb, migrate } from "@/lib/db";

export const runtime = "nodejs";

export async function POST(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;

  const db = getDb();
  try {
    migrate(db);

    const now = Date.now();

    db.prepare(`
      INSERT INTO collection_items (card_id, qty, updated_at)
      VALUES (?, 1, ?)
      ON CONFLICT(card_id) DO UPDATE SET
        qty = qty + 1,
        updated_at = excluded.updated_at
    `).run(id, now);

    return NextResponse.json({ data: { cardId: id } });
  } finally {
    db.close();
  }
}

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;

  const db = getDb();
  try {
    migrate(db);

    const row = db
      .prepare(`SELECT qty FROM collection_items WHERE card_id = ?`)
      .get(id) as { qty: number } | undefined;

    if (!row) {
      return NextResponse.json({ data: { changes: 0 } });
    }

    if (row.qty > 1) {
      const now = Date.now();
      const result = db
        .prepare(`UPDATE collection_items SET qty = qty - 1, updated_at = ? WHERE card_id = ?`)
        .run(now, id);

      return NextResponse.json({ data: { changes: result.changes } });
    }

    const result = db
      .prepare(`DELETE FROM collection_items WHERE card_id = ?`)
      .run(id);

    return NextResponse.json({ data: { changes: result.changes } });
  } finally {
    db.close();
  }
}
