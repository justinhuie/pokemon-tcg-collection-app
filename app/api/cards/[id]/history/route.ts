import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: cardId } = await params;
  const { searchParams } = new URL(req.url);

  const provider = searchParams.get("provider") ?? "tcgplayer";
  const variant = searchParams.get("variant") ?? "holofoil";
  const sinceMs = Number(searchParams.get("sinceMs") ?? 0);
  const limit = Math.min(Number(searchParams.get("limit") ?? 1000), 5000);

  const rows = db
    .prepare(
      `SELECT price, currency, captured_at
       FROM price_history
       WHERE card_id = ? AND provider = ? AND variant = ? AND captured_at >= ?
       ORDER BY captured_at ASC
       LIMIT ?`
    )
    .all(cardId, provider, variant, sinceMs, limit) as {
      price: number;
      currency: string;
      captured_at: number;
    }[];

  return NextResponse.json(rows.map(r => ({ t: r.captured_at, y: r.price, currency: r.currency })));
}
