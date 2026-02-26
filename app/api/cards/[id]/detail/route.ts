import { NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";

export const runtime = "nodejs";

type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

function asString(v: JsonValue | undefined): string | null {
  return typeof v === "string" ? v : null;
}

function asStringArray(v: JsonValue | undefined): string[] {
  if (!Array.isArray(v)) return [];
  const out: string[] = [];
  for (const item of v) {
    if (typeof item === "string" && item.trim()) out.push(item.trim());
  }
  return out;
}

function findCardById(
  filePath: string,
  id: string
): { [key: string]: JsonValue } | null {
  try {
    const raw = fs.readFileSync(filePath, "utf8");
    const arr: unknown = JSON.parse(raw);
    if (!Array.isArray(arr)) return null;
    for (const item of arr) {
      if (
        item &&
        typeof item === "object" &&
        !Array.isArray(item) &&
        (item as { [key: string]: JsonValue }).id === id
      ) {
        return item as { [key: string]: JsonValue };
      }
    }
  } catch {
    // unreadable file
  }
  return null;
}

function formatCard(obj: { [key: string]: JsonValue }, id: string) {
  const name = asString(obj.name);
  if (!name) return null;

  const set_id = asString(obj.set_id) ?? asString(obj.setId) ?? null;
  const set_name = asString(obj.set_name) ?? asString(obj.setName) ?? null;
  const number = asString(obj.number) ?? null;
  const rarity = asString(obj.rarity) ?? null;
  const types = asStringArray(obj.types);

  const imagesObj =
    obj.images && typeof obj.images === "object" && !Array.isArray(obj.images)
      ? (obj.images as { [key: string]: JsonValue })
      : {};

  const image_small =
    asString(obj.image_small) ?? asString(imagesObj.small) ?? null;
  const image_large =
    asString(obj.image_large) ?? asString(imagesObj.large) ?? null;

  return {
    id,
    name,
    set_id,
    set_name,
    number,
    rarity,
    types,
    image_small,
    images: { small: image_small, large: image_large },
  };
}

function loadSetsMap(dataDir: string): Record<string, string> {
  try {
    const arr = JSON.parse(
      fs.readFileSync(path.join(dataDir, "sets", "en.json"), "utf8")
    ) as Array<{ id?: string; name?: string }>;
    const map: Record<string, string> = {};
    for (const s of arr) {
      if (typeof s.id === "string" && typeof s.name === "string") {
        map[s.id] = s.name;
      }
    }
    return map;
  } catch {
    return {};
  }
}

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;

  const dataDir = path.join(process.cwd(), "data", "pokemon-tcg-data");
  const cardsDir = path.join(dataDir, "cards", "en");
  const setsMap = loadSetsMap(dataDir);

  let obj: { [key: string]: JsonValue } | null = null;

  // Try to derive the set file from the card ID (e.g. "base1-4" → "base1.json")
  const lastDash = id.lastIndexOf("-");
  if (lastDash > 0) {
    const setId = id.substring(0, lastDash);
    const filePath = path.join(cardsDir, `${setId}.json`);
    if (fs.existsSync(filePath)) {
      obj = findCardById(filePath, id);
    }
  }

  // Fallback: scan all set files
  if (!obj) {
    try {
      const files = fs.readdirSync(cardsDir);
      for (const file of files) {
        if (!file.endsWith(".json")) continue;
        obj = findCardById(path.join(cardsDir, file), id);
        if (obj) break;
      }
    } catch {
      // directory missing
    }
  }

  if (!obj) {
    return NextResponse.json({ error: "Card not found" }, { status: 404 });
  }

  const card = formatCard(obj, id);
  if (!card) {
    return NextResponse.json({ error: "Card not found" }, { status: 404 });
  }

  // Populate set_id and set_name from sets map if missing
  if (!card.set_id && lastDash > 0) {
    card.set_id = id.substring(0, lastDash);
  }
  if (!card.set_name && card.set_id) {
    card.set_name = setsMap[card.set_id] ?? null;
  }

  return NextResponse.json({ data: card });
}
