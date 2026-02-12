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
      INSERT INTO wishlist_items (card_id, priority, added_at)
      VALUES (?, 2, ?)
      ON CONFLICT(card_id) DO UPDATE SET
        added_at = excluded.added_at
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
    const result = db.prepare(`DELETE FROM wishlist_items WHERE card_id = ?`).run(id);
    return NextResponse.json({ data: { changes: result.changes } });
  } finally {
    db.close();
  }
}
