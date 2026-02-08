import { NextResponse } from "next/server";
import { getDb, migrate } from "@/lib/db";

export const runtime = "nodejs";

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;

  const db = getDb();
  try {
    migrate(db);
    db.prepare(`DELETE FROM wishlist_items WHERE card_id = ?`).run(id);
    return NextResponse.json({ data: { cardId: id } });
  } finally {
    db.close();
  }
}
