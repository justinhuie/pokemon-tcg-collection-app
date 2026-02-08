// app/api/filters/route.ts
import { NextResponse } from "next/server";
import { getDb, migrate } from "@/lib/db";

export const runtime = "nodejs";

type FiltersPayload = {
  sets: string[];
  rarities: string[];
  types: string[];
};

type TypesJsonRow = { types_json: string | null };

function cleanString(s: string) {
  return s.trim();
}

export async function GET() {
  const db = getDb();
  migrate(db);

  // 1) Sets
  const setRows = db
    .prepare(
      `
      SELECT DISTINCT set_name
      FROM cards
      WHERE set_name IS NOT NULL AND TRIM(set_name) <> ''
      ORDER BY set_name ASC;
    `
    )
    .all() as Array<{ set_name: string }>;

  const sets = setRows.map((r) => cleanString(r.set_name));

  // 2) Rarities
  const rarityRows = db
    .prepare(
      `
      SELECT DISTINCT rarity
      FROM cards
      WHERE rarity IS NOT NULL AND TRIM(rarity) <> ''
      ORDER BY rarity ASC;
    `
    )
    .all() as Array<{ rarity: string }>;

  const rarities = rarityRows.map((r) => cleanString(r.rarity));

  // 3) Types (stored as JSON array in types_json)
  const typeRows = db
    .prepare(
      `
      SELECT types_json
      FROM cards
      WHERE types_json IS NOT NULL AND TRIM(types_json) <> '';
    `
    )
    .all() as TypesJsonRow[];

  const typeSet = new Set<string>();
  for (const row of typeRows) {
    const raw = row.types_json;
    if (!raw) continue;

    try {
      const parsed: unknown = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        for (const t of parsed) {
          if (typeof t === "string" && t.trim()) typeSet.add(t.trim());
        }
      }
    } catch {
      // ignore bad rows
    }
  }

  const types = Array.from(typeSet).sort((a, b) => a.localeCompare(b));

  db.close();

  const payload: FiltersPayload = { sets, rarities, types };
  return NextResponse.json({ data: payload });
}
