// app/api/search-cards/route.ts
import { NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";

export const runtime = "nodejs";

const PAGE_SIZE_DEFAULT = 30;

type SearchCard = {
  id: string;
  name: string;
  set_id: string | null;
  set_name: string | null;
  number: string | null;
  rarity: string | null;
  types: string[];
  image_small: string | null;
  image_large: string | null;
  owned_qty: number;
  wishlisted: boolean;
};

type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

type CardRow = {
  id: string;
  name: string;
  set_id: string | null;
  set_name: string | null;
  number: string | null;
  rarity: string | null;
  types: string[];
  image_small: string | null;
  image_large: string | null;
};

function clampInt(n: number, min: number, max: number): number {
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, Math.floor(n)));
}

function cleanString(s: string): string {
  return s.trim();
}

function asString(v: JsonValue): string | null {
  return typeof v === "string" ? v : null;
}

function asStringArray(v: JsonValue): string[] {
  if (!Array.isArray(v)) return [];
  const out: string[] = [];
  for (const item of v) {
    if (typeof item === "string" && item.trim()) out.push(item.trim());
  }
  return out;
}

function toCardRow(v: JsonValue): CardRow | null {
  if (v === null || typeof v !== "object" || Array.isArray(v)) return null;
  const obj = v as { [key: string]: JsonValue };

  const id = asString(obj.id);
  const name = asString(obj.name);

  if (!id || !name) return null;

  const set_id = asString(obj.set_id) ?? asString(obj.setId) ?? null;
  const set_name = asString(obj.set_name) ?? asString(obj.setName) ?? null;

  const number = asString(obj.number) ?? null;
  const rarity = asString(obj.rarity) ?? null;

  const types = asStringArray(obj.types);

  const image_small =
    asString(obj.image_small) ??
    (obj.images && typeof obj.images === "object" && !Array.isArray(obj.images)
      ? asString((obj.images as { [key: string]: JsonValue }).small)
      : null) ??
    null;

  const image_large =
    asString(obj.image_large) ??
    (obj.images && typeof obj.images === "object" && !Array.isArray(obj.images)
      ? asString((obj.images as { [key: string]: JsonValue }).large)
      : null) ??
    null;

  return {
    id,
    name,
    set_id,
    set_name,
    number,
    rarity,
    types,
    image_small,
    image_large,
  };
}

function parseJsonArray(raw: string): JsonValue[] | null {
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as JsonValue[]) : null;
  } catch {
    return null;
  }
}

function includesInsensitive(haystack: string, needle: string): boolean {
  return haystack.toLowerCase().includes(needle.toLowerCase());
}

function normalizeQuery(q: string): string {
  return q
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

function looksLikeSetId(s: string): boolean {
  const v = s.trim();
  if (!v) return false;
  if (v.length > 20) return false;
  return /^[a-z0-9]+$/i.test(v);
}

function compareNullable(a: string | null, b: string | null): number {
  const aa = a ?? "";
  const bb = b ?? "";
  return aa.localeCompare(bb);
}

function compareCardNumber(a: string | null, b: string | null): number {
  // Try numeric compare first, fall back to lexicographic
  const na = a ? Number(a) : NaN;
  const nb = b ? Number(b) : NaN;
  const aNumOk = Number.isFinite(na);
  const bNumOk = Number.isFinite(nb);
  if (aNumOk && bNumOk) return na - nb;
  return compareNullable(a, b);
}

function passesFilters(card: CardRow, opts: {
  q: string;
  set: string;
  rarity: string;
  type: string;
}): boolean {
  const { q, set, rarity, type } = opts;

  if (set) {
    if (looksLikeSetId(set)) {
      const match =
        (card.set_id && card.set_id.toLowerCase() === set.toLowerCase()) ||
        (card.set_name && card.set_name.toLowerCase() === set.toLowerCase()) ||
        (card.set_name && includesInsensitive(card.set_name, set));
      if (!match) return false;
    } else {
      const match =
        (card.set_name && card.set_name.toLowerCase() === set.toLowerCase()) ||
        (card.set_name && includesInsensitive(card.set_name, set)) ||
        (card.set_id && card.set_id.toLowerCase() === set.toLowerCase());
      if (!match) return false;
    }
  }

  if (rarity) {
    if (!card.rarity || card.rarity !== rarity) return false;
  }

  if (type) {
    if (!card.types.some((t) => t === type)) return false;
  }

  if (q) {
    // simple contains search on name + set + number + rarity
    const parts = q.split(" ").filter(Boolean);
    const name = card.name;
    const setName = card.set_name ?? "";
    const number = card.number ?? "";
    const rar = card.rarity ?? "";

    for (const p of parts) {
      const ok =
        includesInsensitive(name, p) ||
        includesInsensitive(setName, p) ||
        includesInsensitive(number, p) ||
        includesInsensitive(rar, p);
      if (!ok) return false;
    }
  }

  return true;
}

function loadSetsMap(dataDir: string): Record<string, string> {
  try {
    const setsPath = path.join(dataDir, "sets", "en.json");
    const arr = JSON.parse(fs.readFileSync(setsPath, "utf8")) as Array<{
      id?: string;
      name?: string;
    }>;
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

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  const qRaw = (searchParams.get("q") ?? "").trim();
  const q = qRaw.length >= 2 ? normalizeQuery(qRaw) : "";

  const limit = clampInt(Number(searchParams.get("limit") ?? String(PAGE_SIZE_DEFAULT)), 1, 60);
  const page = clampInt(Number(searchParams.get("page") ?? "1"), 1, 10_000);
  const offset = (page - 1) * limit;

  const set = cleanString(searchParams.get("set") ?? "");
  const rarity = cleanString(searchParams.get("rarity") ?? "");
  const type = cleanString(searchParams.get("type") ?? "");

  // These were DB-backed; keep for compatibility but ignore in JSON mode
  // const owned = (searchParams.get("owned") ?? "") === "1";
  // const wishlisted = (searchParams.get("wishlisted") ?? "") === "1";

  const sort = cleanString(searchParams.get("sort") ?? "");

  try {
    const dataDir = path.join(process.cwd(), "data", "pokemon-tcg-data");
    const cardsDir = path.join(dataDir, "cards", "en");
    const setsMap = loadSetsMap(dataDir);
    const files = fs.readdirSync(cardsDir);

    const matches: CardRow[] = [];

    for (const file of files) {
      if (!file.endsWith(".json")) continue;

      const fullPath = path.join(cardsDir, file);
      const raw = fs.readFileSync(fullPath, "utf8");
      const arr = parseJsonArray(raw);
      if (!arr) continue;

      for (const item of arr) {
        const card = toCardRow(item);
        if (!card) continue;

        // Derive set_name from sets map if not present in card data
        if (!card.set_name && card.set_id) {
          card.set_name = setsMap[card.set_id] ?? null;
        }
        // Derive set_id from card id if still missing (e.g. "base1-4" → "base1")
        if (!card.set_id) {
          const dash = card.id.lastIndexOf("-");
          if (dash > 0) {
            const derivedSetId = card.id.substring(0, dash);
            card.set_id = derivedSetId;
            card.set_name = setsMap[derivedSetId] ?? null;
          }
        }

        if (passesFilters(card, { q, set, rarity, type })) {
          matches.push(card);
        }
      }
    }

    // Sorting
    if (sort === "set") {
      matches.sort((a, b) => {
        const c1 = compareNullable(a.set_name, b.set_name);
        if (c1 !== 0) return c1;
        const c2 = a.name.localeCompare(b.name);
        if (c2 !== 0) return c2;
        return a.id.localeCompare(b.id);
      });
    } else if (sort === "rarity") {
      matches.sort((a, b) => {
        const c1 = compareNullable(a.rarity, b.rarity);
        if (c1 !== 0) return c1;
        const c2 = a.name.localeCompare(b.name);
        if (c2 !== 0) return c2;
        return a.id.localeCompare(b.id);
      });
    } else if (sort === "number") {
      matches.sort((a, b) => {
        const c1 = compareCardNumber(a.number, b.number);
        if (c1 !== 0) return c1;
        const c2 = a.name.localeCompare(b.name);
        if (c2 !== 0) return c2;
        return a.id.localeCompare(b.id);
      });
    } else {
      // default: name
      matches.sort((a, b) => {
        const c1 = a.name.localeCompare(b.name);
        if (c1 !== 0) return c1;
        return a.id.localeCompare(b.id);
      });
    }

    const pageItems = matches.slice(offset, offset + limit);

    const data: SearchCard[] = pageItems.map((r) => ({
      id: r.id,
      name: r.name,
      set_id: r.set_id,
      set_name: r.set_name,
      number: r.number,
      rarity: r.rarity,
      types: r.types,
      image_small: r.image_small,
      image_large: r.image_large,
      owned_qty: 0,
      wishlisted: false,
    }));

    return NextResponse.json({ data });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Search failed";
    return new NextResponse(msg, { status: 500 });
  }
}