import fs from "fs";
import path from "path";
import { getDb, migrate, rebuildCardsFts } from "../lib/db";

type RawCard = {
  id?: string;
  name?: string;
  number?: string;
  rarity?: string;
  types?: string[];
  images?: { small?: string; large?: string };
};

type SetsFileEntry = {
  id: string;
  name: string;
};

type CardsFileShape = RawCard[] | { data?: RawCard[]; cards?: RawCard[] } | unknown;

function readJsonFile(filePath: string): unknown {
  const text = fs.readFileSync(filePath, "utf8");
  return JSON.parse(text);
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function getArrayProp<T>(obj: Record<string, unknown>, key: string): T[] | null {
  const v = obj[key];
  return Array.isArray(v) ? (v as T[]) : null;
}

function normalizeCards(json: CardsFileShape): RawCard[] {
  if (Array.isArray(json)) return json as RawCard[];
  if (isObject(json)) {
    const data = getArrayProp<RawCard>(json, "data");
    if (data) return data;
    const cards = getArrayProp<RawCard>(json, "cards");
    if (cards) return cards;
  }
  return [];
}

function loadSetNameMap(): Map<string, string> {
  const setsPath = path.join(process.cwd(), "data", "pokemon-tcg-data", "sets", "en.json");
  if (!fs.existsSync(setsPath)) {
    console.warn(`⚠️ Sets file not found: ${setsPath} (set_name may be null)`);
    return new Map();
  }

  const raw = readJsonFile(setsPath);
  if (!Array.isArray(raw)) {
    console.warn(`⚠️ Sets file format unexpected (expected array): ${setsPath}`);
    return new Map();
  }

  const map = new Map<string, string>();
  for (const entry of raw as SetsFileEntry[]) {
    const id = typeof entry?.id === "string" ? entry.id.trim() : "";
    const name = typeof entry?.name === "string" ? entry.name.trim() : "";
    if (id && name) map.set(id, name);
  }
  return map;
}

function inferSetIdFromCardId(cardId: string): string | null {
  // mcd14-5 -> mcd14
  const idx = cardId.indexOf("-");
  const prefix = (idx >= 0 ? cardId.slice(0, idx) : cardId).trim();
  return prefix || null;
}

function inferSetIdFromImageUrl(url: string): string | null {
  // https://images.pokemontcg.io/mcd14/5.png -> mcd14
  // https://images.pokemontcg.io/mcd14/5_hires.png -> mcd14
  const m = url.match(/images\.pokemontcg\.io\/([^/]+)\//i);
  const id = (m?.[1] ?? "").trim();
  return id || null;
}

function extractSetIdAndName(
  card: RawCard,
  setNameById: Map<string, string>
): { set_id: string | null; set_name: string | null } {
  let set_id: string | null = null;

  const cardId = typeof card.id === "string" ? card.id.trim() : "";
  if (cardId) set_id = inferSetIdFromCardId(cardId);

  if (!set_id) {
    const small = typeof card.images?.small === "string" ? card.images.small : "";
    const large = typeof card.images?.large === "string" ? card.images.large : "";
    set_id = inferSetIdFromImageUrl(small) ?? inferSetIdFromImageUrl(large);
  }

  const set_name = set_id ? setNameById.get(set_id) ?? null : null;

  return { set_id, set_name };
}

type InsertRow = {
  id: string;
  name: string;
  set_id: string | null;
  set_name: string | null;
  number: string | null;
  rarity: string | null;
  types_json: string | null;
  image_small: string | null;
  image_large: string | null;
};

async function main() {
  const cardsDir = path.join(process.cwd(), "data", "pokemon-tcg-data", "cards", "en");
  if (!fs.existsSync(cardsDir)) {
    console.error(`❌ Cards directory not found: ${cardsDir}`);
    console.error(`Make sure you have: data/pokemon-tcg-data/cards/en/*.json`);
    process.exit(1);
  }

  const files = fs
    .readdirSync(cardsDir)
    .filter((f) => f.toLowerCase().endsWith(".json"))
    .map((f) => path.join(cardsDir, f));

  console.log(`Found ${files.length} set files in ${cardsDir}`);

  const setNameById = loadSetNameMap();
  console.log(`Loaded ${setNameById.size} sets from data/pokemon-tcg-data/sets/en.json`);

  const db = getDb();
  migrate(db);

  const insert = db.prepare(`
    INSERT INTO cards (
      id, name, set_id, set_name, number, rarity, types_json, image_small, image_large
    ) VALUES (
      @id, @name, @set_id, @set_name, @number, @rarity, @types_json, @image_small, @image_large
    )
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name,
      set_id = excluded.set_id,
      set_name = excluded.set_name,
      number = excluded.number,
      rarity = excluded.rarity,
      types_json = excluded.types_json,
      image_small = excluded.image_small,
      image_large = excluded.image_large;
  `);

  const tx = db.transaction((rows: InsertRow[]) => {
    for (const row of rows) insert.run(row);
  });

  let total = 0;

  for (const file of files) {
    const json = readJsonFile(file) as CardsFileShape;
    const cards = normalizeCards(json);

    const rows: InsertRow[] = [];
    for (const c of cards) {
      const id = typeof c.id === "string" ? c.id.trim() : "";
      const name = typeof c.name === "string" ? c.name.trim() : "";
      if (!id || !name) continue;

      const { set_id, set_name } = extractSetIdAndName(c, setNameById);

      rows.push({
        id,
        name,
        set_id,
        set_name,
        number: typeof c.number === "string" ? c.number : null,
        rarity: typeof c.rarity === "string" ? c.rarity : null,
        types_json: Array.isArray(c.types) ? JSON.stringify(c.types) : null,
        image_small: typeof c.images?.small === "string" ? c.images.small : null,
        image_large: typeof c.images?.large === "string" ? c.images.large : null,
      });
    }

    tx(rows);
    total += rows.length;
  }

  console.log(`Inserted/updated ${total} cards into data/app.db`);
  console.log("Rebuilding FTS index…");
  rebuildCardsFts(db);
  db.close();

  console.log("✅ Catalog seeded and FTS ready.");
}

main().catch((e) => {
  console.error("❌ Seed failed:", e);
  process.exit(1);
});
