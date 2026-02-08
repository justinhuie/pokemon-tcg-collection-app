// pokemon-tracker/lib/db.ts
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
  // Ensure /data exists
  fs.mkdirSync(path.join(process.cwd(), "data"), { recursive: true });

  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  return db;
}

export function migrate(db: DB) {
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
      image_large TEXT
    );

    -- Full-text search (offline fast search)
    CREATE VIRTUAL TABLE IF NOT EXISTS cards_fts USING fts5(
      id UNINDEXED,
      name,
      set_name,
      number,
      rarity,
      tokenize = 'unicode61'
    );

    CREATE INDEX IF NOT EXISTS idx_cards_set_id ON cards(set_id);

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

  // Note: we rebuild FTS after seed import. If you later do incremental updates,
  // we can add triggers to keep cards_fts in sync automatically.
}

export function rebuildCardsFts(db: DB) {
  db.exec(`
    DELETE FROM cards_fts;
    INSERT INTO cards_fts (id, name, set_name, number, rarity)
    SELECT
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

  // Turn "charizard vmax" into "charizard* vmax*"
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
