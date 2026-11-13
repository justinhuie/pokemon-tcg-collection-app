import Database from "better-sqlite3";
import fs from "fs";
import path from "path";

const DB_PATH = path.join(process.cwd(), "data", "app.db");

export type DB = Database.Database;

export type CardRow = {
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

export function getDb(): DB {
  fs.mkdirSync(path.join(process.cwd(), "data"), { recursive: true });

  const db = new Database(DB_PATH);
  // Keep the default rollback journal. WAL mode is persisted in the file
  // header, and a WAL database can't be opened on a read-only filesystem
  // (e.g. Vercel serverless functions), which breaks the committed app.db.
  db.pragma("foreign_keys = ON");
  return db;
}

export function migrate(db: DB) {
  // Databases seeded before `supertype` existed need the column added
  // before the index/table statements below run.
  const hasCards = db
    .prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='cards'")
    .get();
  if (hasCards) {
    const cols = db.prepare("PRAGMA table_info(cards)").all() as { name: string }[];
    if (!cols.some((c) => c.name === "supertype")) {
      db.exec("ALTER TABLE cards ADD COLUMN supertype TEXT");
    }
  }

  db.exec(`
    -- Main catalog
    CREATE TABLE IF NOT EXISTS cards (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      set_id TEXT,
      set_name TEXT,
      number TEXT,
      rarity TEXT,
      types_json TEXT,
      image_small TEXT,
      image_large TEXT,
      supertype TEXT
    );

    -- Full-text search (offline fast search).
    -- FTS rowid mirrors cards.rowid so lookups join on the integer key.
    CREATE VIRTUAL TABLE IF NOT EXISTS cards_fts USING fts5(
      id UNINDEXED,
      name,
      set_name,
      number,
      rarity,
      tokenize = 'unicode61'
    );

    -- Normalized card -> energy type mapping (a card can have several types)
    CREATE TABLE IF NOT EXISTS card_types (
      card_id TEXT NOT NULL,
      type TEXT NOT NULL,
      PRIMARY KEY (card_id, type),
      FOREIGN KEY (card_id) REFERENCES cards(id) ON DELETE CASCADE
    ) WITHOUT ROWID;

    CREATE INDEX IF NOT EXISTS idx_cards_set_id ON cards(set_id);
    CREATE INDEX IF NOT EXISTS idx_cards_name ON cards(name COLLATE NOCASE, id);
    CREATE INDEX IF NOT EXISTS idx_cards_rarity ON cards(rarity);
    CREATE INDEX IF NOT EXISTS idx_card_types_type ON card_types(type, card_id);

    -- ============================
    -- Milestone 1: Tracker Tables
    -- ============================

    -- Collection: one row per card_id (track qty + optional metadata)
    CREATE TABLE IF NOT EXISTS collection_items (
      card_id TEXT PRIMARY KEY,
      qty INTEGER NOT NULL DEFAULT 1,
      variant TEXT,
      condition TEXT,
      notes TEXT,
      updated_at INTEGER NOT NULL,  -- unix ms
      FOREIGN KEY (card_id) REFERENCES cards(id) ON DELETE CASCADE
    );

    -- Wishlist: one row per card_id (track priority + notes)
    CREATE TABLE IF NOT EXISTS wishlist_items (
      card_id TEXT PRIMARY KEY,
      priority INTEGER NOT NULL DEFAULT 2, -- 1..5
      notes TEXT,
      added_at INTEGER NOT NULL, -- unix ms
      FOREIGN KEY (card_id) REFERENCES cards(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_collection_updated_at ON collection_items(updated_at);
    CREATE INDEX IF NOT EXISTS idx_wishlist_added_at ON wishlist_items(added_at);
  `);
}

export function rebuildCardsFts(db: DB) {
  db.exec(`
    DELETE FROM cards_fts;
    INSERT INTO cards_fts (rowid, id, name, set_name, number, rarity)
    SELECT
      rowid,
      id,
      name,
      COALESCE(set_name,''),
      COALESCE(number,''),
      COALESCE(rarity,'')
    FROM cards;
  `);
}

function normalizeFtsQuery(q: string) {
  const cleaned = q
    .trim()
    .replace(/["']/g, " ")
    .replace(/[^\p{L}\p{N}\s-]/gu, " ")
    .replace(/\s+/g, " ");

  if (!cleaned) return "";

  return cleaned
    .split(" ")
    .filter(Boolean)
    .map((t) => `${t}*`)
    .join(" ");
}

export function searchCards(db: DB, q: string, limit = 25): CardRow[] {
  const fts = normalizeFtsQuery(q);
  if (!fts) return [];

  const stmt = db.prepare(`
    SELECT
      c.id, c.name, c.set_id, c.set_name, c.number, c.rarity,
      c.types_json, c.image_small, c.image_large
    FROM cards_fts f
    JOIN cards c ON c.id = f.id
    WHERE cards_fts MATCH ?
    LIMIT ?;
  `);

  return stmt.all(fts, limit) as CardRow[];
}

export function getCardById(db: DB, id: string): CardRow | null {
  const stmt = db.prepare(`
    SELECT
      id, name, set_id, set_name, number, rarity,
      types_json, image_small, image_large
    FROM cards
    WHERE id = ?;
  `);

  const row = stmt.get(id) as CardRow | undefined;
  return row ?? null;
}

export function rebuildCardTypes(db: DB) {
  db.exec(`
    DELETE FROM card_types;
    INSERT OR IGNORE INTO card_types (card_id, type)
    SELECT c.id, TRIM(j.value)
    FROM cards c, json_each(c.types_json) j
    WHERE c.types_json IS NOT NULL
      AND json_valid(c.types_json)
      AND TRIM(j.value) <> '';
    ANALYZE;
  `);
}

// ---------------------------------------------------------------------------
// Catalog search (used by /api/search-cards)
// ---------------------------------------------------------------------------

type ReadCache = { db: DB; stmts: Map<string, Database.Statement> };

const globalForDb = globalThis as unknown as { __catalogRead?: ReadCache };

/**
 * One long-lived read-only connection per server process. Opening a SQLite
 * connection and re-preparing statements on every request is wasted work,
 * so both are cached (globalThis keeps it alive across dev hot reloads).
 */
function getReadCache(): ReadCache {
  if (!globalForDb.__catalogRead) {
    const db = new Database(DB_PATH, { readonly: true, fileMustExist: true });
    globalForDb.__catalogRead = { db, stmts: new Map() };
  }
  return globalForDb.__catalogRead;
}

function prepareCached(sql: string): Database.Statement {
  const cache = getReadCache();
  let stmt = cache.stmts.get(sql);
  if (!stmt) {
    stmt = cache.db.prepare(sql);
    cache.stmts.set(sql, stmt);
  }
  return stmt;
}

/**
 * Turn free text into a safe FTS5 query: every token becomes a quoted
 * prefix term ("pika"*), and terms are ANDed. Quoting means user input can
 * never be parsed as FTS5 syntax (AND/OR/NEAR, column filters, etc.).
 */
export function toFtsQuery(q: string): string {
  return q
    .normalize("NFKC")
    .replace(/[^\p{L}\p{N}\s-]/gu, " ")
    .split(/\s+/)
    .map((t) => t.replace(/^-+|-+$/g, ""))
    .filter((t) => /[\p{L}\p{N}]/u.test(t))
    .map((t) => `"${t}"*`)
    .join(" ");
}

export type CatalogSort = "name" | "set" | "rarity" | "number";

export type CatalogSearchParams = {
  q: string;
  set: string;
  rarity: string;
  type: string;
  sort: CatalogSort;
  limit: number;
  offset: number;
};

export type CatalogCardRow = CardRow & { supertype: string | null };

const ORDER_BY: Record<CatalogSort, string> = {
  name: "c.name COLLATE NOCASE, c.id",
  set: "c.set_name COLLATE NOCASE, c.name COLLATE NOCASE, c.id",
  rarity: "c.rarity COLLATE NOCASE, c.name COLLATE NOCASE, c.id",
  number: "CAST(c.number AS INTEGER), c.number, c.name COLLATE NOCASE, c.id",
};

function escapeLike(s: string): string {
  return s.replace(/[!%_]/g, (m) => `!${m}`);
}

/**
 * Search the catalog with optional full-text query, filters, sort and
 * pagination, all executed inside SQLite. Only the requested page of rows
 * ever crosses into JavaScript.
 */
export function searchCatalog(p: CatalogSearchParams): CatalogCardRow[] {
  const where: string[] = [];
  const args: (string | number)[] = [];

  if (p.q) {
    const fts = toFtsQuery(p.q);
    if (!fts) return [];
    where.push("c.rowid IN (SELECT rowid FROM cards_fts WHERE cards_fts MATCH ?)");
    args.push(fts);
  }

  if (p.set) {
    // Exact set id (e.g. "base1") or case-insensitive set-name substring.
    where.push("(c.set_id = ? COLLATE NOCASE OR c.set_name LIKE ? ESCAPE '!')");
    args.push(p.set, `%${escapeLike(p.set)}%`);
  }

  if (p.rarity) {
    where.push("c.rarity = ?");
    args.push(p.rarity);
  }

  if (p.type) {
    where.push("c.id IN (SELECT card_id FROM card_types WHERE type = ?)");
    args.push(p.type);
  }

  const sql = `
    SELECT
      c.id, c.name, c.supertype, c.set_id, c.set_name, c.number, c.rarity,
      c.types_json, c.image_small, c.image_large
    FROM cards c
    ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
    ORDER BY ${ORDER_BY[p.sort] ?? ORDER_BY.name}
    LIMIT ? OFFSET ?`;

  return prepareCached(sql).all(...args, p.limit, p.offset) as CatalogCardRow[];
}
