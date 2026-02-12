import { NextResponse } from "next/server";
import { getDb, migrate } from "@/lib/db";

export const runtime = "nodejs";

export async function POST(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;

  const db = getDb();
  migrate(db);

  const now = Date.now();

  db.prepare(
    `
    INSERT INTO collection_items (card_id, qty, updated_at)
    VALUES (?, 1, ?)
    ON CONFLICT(card_id) DO UPDATE SET
      qty = qty + 1,
      updated_at = excluded.updated_at;
  `
  ).run(id, now);

  db.close();

  return NextResponse.json({ ok: true, cardId: id, updated_at: now });
}

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;

  const db = getDb();
  migrate(db);

  db.prepare(`DELETE FROM collection_items WHERE card_id = ?;`).run(id);

  db.close();

  return NextResponse.json({ ok: true, removed: true, cardId: id });
}
