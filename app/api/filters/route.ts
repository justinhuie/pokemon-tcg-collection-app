// app/api/filters/route.ts
import { NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";

export const runtime = "nodejs";

type FiltersPayload = {
  sets: string[];
  rarities: string[];
  types: string[];
};

type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

type CardRow = {
  set_name?: string | null;
  rarity?: string | null;
  types?: string[] | null;
};

function cleanString(s: string) {
  return s.trim();
}

function parseJsonArray(raw: string): JsonValue[] | null {
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as JsonValue[]) : null;
  } catch {
    return null;
  }
}

function toCardRow(v: JsonValue): CardRow {
  if (v === null || typeof v !== "object" || Array.isArray(v)) return {};

  const obj = v as { [key: string]: JsonValue };

  const set_name =
    typeof obj.set_name === "string" ? obj.set_name : null;

  const rarity =
    typeof obj.rarity === "string" ? obj.rarity : null;

  const types =
    Array.isArray(obj.types) && obj.types.every((t) => typeof t === "string")
      ? (obj.types as string[])
      : null;

  return { set_name, rarity, types };
}

function loadSetNames(baseDir: string): string[] {
  try {
    const setsPath = path.join(baseDir, "sets", "en.json");
    const raw = fs.readFileSync(setsPath, "utf8");
    const arr = JSON.parse(raw) as Array<{ id?: string; name?: string }>;
    return arr
      .map((s) => (typeof s.name === "string" ? s.name.trim() : ""))
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b));
  } catch {
    return [];
  }
}

export async function GET() {
  try {
    const baseDir = path.join(process.cwd(), "data", "pokemon-tcg-data");
    const cardsDir = path.join(baseDir, "cards", "en");

    const raritySet = new Set<string>();
    const typeSet = new Set<string>();

    const files = fs.readdirSync(cardsDir);

    for (const file of files) {
      if (!file.endsWith(".json")) continue;

      const fullPath = path.join(cardsDir, file);
      const raw = fs.readFileSync(fullPath, "utf8");

      const arr = parseJsonArray(raw);
      if (!arr) continue;

      for (const item of arr) {
        const card = toCardRow(item);

        if (card.rarity) {
          const val = cleanString(card.rarity);
          if (val) raritySet.add(val);
        }

        if (card.types) {
          for (const t of card.types) {
            const val = cleanString(t);
            if (val) typeSet.add(val);
          }
        }
      }
    }

    const payload: FiltersPayload = {
      sets: loadSetNames(baseDir),
      rarities: Array.from(raritySet).sort((a, b) => a.localeCompare(b)),
      types: Array.from(typeSet).sort((a, b) => a.localeCompare(b)),
    };

    return NextResponse.json({ data: payload });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "failed";
    return NextResponse.json(
      { data: { sets: [], rarities: [], types: [] }, error: msg },
      { status: 200 }
    );
  }
}