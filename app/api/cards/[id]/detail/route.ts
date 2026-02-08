import { NextResponse } from "next/server";
import { getDb, migrate, getCardById, type CardRow } from "@/lib/db";

export const runtime = "nodejs";

type CardDetail = {
  id: string;
  name: string;
  set_id: string | null;
  set_name: string | null;
  number: string | null;
  rarity: string | null;
  types: string[];
  images: { small: string | null; large: string | null };
};

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;

  const db = getDb();
  migrate(db);

  const card: CardRow | null = getCardById(db, id);
  db.close();

  if (!card) {
    return NextResponse.json({ error: "Card not found" }, { status: 404 });
  }

  const data: CardDetail = {
    id: card.id,
    name: card.name,
    set_id: card.set_id,
    set_name: card.set_name,
    number: card.number,
    rarity: card.rarity,
    types: safeJsonArray(card.types_json),
    images: { small: card.image_small, large: card.image_large },
  };

  return NextResponse.json({ data, source: "sqlite" });
}

function safeJsonArray(s: string | null): string[] {
  try {
    if (!s) return [];
    const v: unknown = JSON.parse(s);
    return Array.isArray(v) && v.every((x) => typeof x === "string")
      ? (v as string[])
      : [];
  } catch {
    return [];
  }
}
