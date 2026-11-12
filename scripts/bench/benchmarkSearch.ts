/**
 * Benchmarks /api/search-cards: the original JSON-scan implementation
 * (scripts/bench/legacySearchRoute.ts) vs the SQLite/FTS5 implementation
 * (app/api/search-cards/route.ts).
 *
 * Modes
 *   npx tsx scripts/bench/benchmarkSearch.ts                 in-process: calls both GET handlers directly
 *   npx tsx scripts/bench/benchmarkSearch.ts --http <base>   end-to-end: HTTP against a running `next start`
 *                                                            (needs a temporary /api/search-cards-legacy route,
 *                                                            see scripts/bench/README.md)
 * Options
 *   --iters N    timed requests per query per implementation (default 100)
 *   --warmup N   untimed requests first (default 10)
 *   --parity     also compare full result sets between the two implementations
 */
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { GET as legacyGET, loadSetsMap, normalizeQuery, passesFilters, toCardRow } from "./legacySearchRoute";
import { GET as sqliteGET } from "../../app/api/search-cards/route";
import { searchCatalog, type CatalogSort } from "../../lib/db";

import { QUERIES } from "./benchmarkSearch.queries";

// ---------------------------------------------------------------- args
const argv = process.argv.slice(2);
const arg = (name: string) => {
  const i = argv.indexOf(name);
  return i >= 0 ? argv[i + 1] : undefined;
};
const HTTP_BASE = arg("--http");
const ITERS = Number(arg("--iters") ?? 100);
const WARMUP = Number(arg("--warmup") ?? 10);
const PARITY = argv.includes("--parity");
const MODE = HTTP_BASE ? "http" : "in-process";

// ---------------------------------------------------------------- runners
type Runner = (qs: string) => Promise<string[]>;

const inProcess = (get: (req: Request) => Promise<Response>): Runner => async (qs) => {
  const res = await get(new Request(`http://localhost/api/search-cards?${qs}`));
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
  const json = (await res.json()) as { data: { id: string }[] };
  return json.data.map((c) => c.id);
};

const overHttp = (route: string): Runner => async (qs) => {
  const res = await fetch(`${HTTP_BASE}${route}?${qs}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
  const json = (await res.json()) as { data: { id: string }[] };
  return json.data.map((c) => c.id);
};

const RUNNERS: Record<"legacy" | "sqlite", Runner> = HTTP_BASE
  ? { legacy: overHttp("/api/search-cards-legacy"), sqlite: overHttp("/api/search-cards") }
  : { legacy: inProcess(legacyGET), sqlite: inProcess(sqliteGET) };

// ---------------------------------------------------------------- stats
function pct(sorted: number[], p: number): number {
  const i = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
  return sorted[i];
}
function summarize(samples: number[]) {
  const s = [...samples].sort((a, b) => a - b);
  const r = (n: number) => Math.round(n * 100) / 100;
  return {
    n: s.length,
    min: r(s[0]),
    median: r(pct(s, 50)),
    mean: r(s.reduce((a, b) => a + b, 0) / s.length),
    p95: r(pct(s, 95)),
    p99: r(pct(s, 99)),
    max: r(s[s.length - 1]),
  };
}

async function time(run: Runner, qs: string, iters: number): Promise<number[]> {
  const out: number[] = [];
  for (let i = 0; i < iters; i++) {
    const t0 = performance.now();
    await run(qs);
    out.push(performance.now() - t0);
  }
  return out;
}

// ---------------------------------------------------------------- parity
function legacyAllMatches(params: URLSearchParams): Set<string> {
  const dataDir = path.join(process.cwd(), "data", "pokemon-tcg-data");
  const cardsDir = path.join(dataDir, "cards", "en");
  const setsMap = loadSetsMap(dataDir);
  const qRaw = (params.get("q") ?? "").trim();
  const opts = {
    q: qRaw.length >= 2 ? normalizeQuery(qRaw) : "",
    set: (params.get("set") ?? "").trim(),
    rarity: (params.get("rarity") ?? "").trim(),
    type: (params.get("type") ?? "").trim(),
  };
  const ids = new Set<string>();
  for (const f of fs.readdirSync(cardsDir)) {
    if (!f.endsWith(".json")) continue;
    for (const item of JSON.parse(fs.readFileSync(path.join(cardsDir, f), "utf8"))) {
      const card = toCardRow(item);
      if (!card) continue;
      if (!card.set_name && card.set_id) card.set_name = setsMap[card.set_id] ?? null;
      if (!card.set_id) {
        const dash = card.id.lastIndexOf("-");
        if (dash > 0) {
          card.set_id = card.id.substring(0, dash);
          card.set_name = setsMap[card.set_id] ?? null;
        }
      }
      if (passesFilters(card, opts)) ids.add(card.id);
    }
  }
  return ids;
}

function sqliteAllMatches(params: URLSearchParams): Set<string> {
  const qRaw = (params.get("q") ?? "").trim();
  const rows = searchCatalog({
    q: qRaw.length >= 2 ? qRaw : "",
    set: (params.get("set") ?? "").trim(),
    rarity: (params.get("rarity") ?? "").trim(),
    type: (params.get("type") ?? "").trim(),
    sort: ((params.get("sort") ?? "") || "name") as CatalogSort,
    limit: 1_000_000,
    offset: 0,
  });
  return new Set(rows.map((r) => r.id));
}

// ---------------------------------------------------------------- main
async function main() {
  console.log(`Mode: ${MODE}${HTTP_BASE ? ` (${HTTP_BASE})` : ""} | iters=${ITERS} warmup=${WARMUP}`);
  console.log(`Node ${process.version} | ${os.cpus()[0]?.model} x${os.cpus().length} | ${os.platform()} ${os.release()}\n`);

  const results: Record<string, unknown>[] = [];

  for (const [i, q] of QUERIES.entries()) {
    // Alternate which implementation runs first to avoid ordering bias.
    const order: ("legacy" | "sqlite")[] = i % 2 === 0 ? ["legacy", "sqlite"] : ["sqlite", "legacy"];
    const samples: Record<string, number[]> = {};
    const firstPage: Record<string, string[]> = {};

    for (const impl of order) {
      firstPage[impl] = await RUNNERS[impl](q.qs);
      await time(RUNNERS[impl], q.qs, WARMUP);
      samples[impl] = await time(RUNNERS[impl], q.qs, ITERS);
    }

    const legacy = summarize(samples.legacy);
    const sqlite = summarize(samples.sqlite);
    const row: Record<string, unknown> = {
      ...q,
      legacy,
      sqlite,
      speedupMedian: Math.round((legacy.median / sqlite.median) * 10) / 10,
      reductionMedianPct: Math.round((1 - sqlite.median / legacy.median) * 1000) / 10,
      reductionP95Pct: Math.round((1 - sqlite.p95 / legacy.p95) * 1000) / 10,
      firstPageIdentical: JSON.stringify(firstPage.legacy) === JSON.stringify(firstPage.sqlite),
      firstPageCount: { legacy: firstPage.legacy.length, sqlite: firstPage.sqlite.length },
    };

    if (PARITY) {
      const params = new URLSearchParams(q.qs);
      const a = legacyAllMatches(params);
      const b = sqliteAllMatches(params);
      const onlyLegacy = [...a].filter((id) => !b.has(id));
      const onlySqlite = [...b].filter((id) => !a.has(id));
      row.parity = {
        legacyMatches: a.size,
        sqliteMatches: b.size,
        onlyLegacy: onlyLegacy.length,
        onlySqlite: onlySqlite.length,
        onlyLegacySample: onlyLegacy.slice(0, 5),
        onlySqliteSample: onlySqlite.slice(0, 5),
      };
    }

    results.push(row);
    console.log(
      `${q.label.padEnd(30)} legacy p50 ${String(legacy.median).padStart(8)} ms  p95 ${String(legacy.p95).padStart(8)} ms | ` +
        `sqlite p50 ${String(sqlite.median).padStart(6)} ms  p95 ${String(sqlite.p95).padStart(6)} ms | ` +
        `${row.speedupMedian}x` +
        (PARITY ? ` | matches ${(row.parity as { legacyMatches: number }).legacyMatches}/${(row.parity as { sqliteMatches: number }).sqliteMatches}` : "")
    );
  }

  const all = (impl: "legacy" | "sqlite") =>
    results.flatMap((r) => [(r[impl] as { median: number }).median]);
  const overall = {
    legacyMedianOfMedians: summarize(all("legacy")).median,
    sqliteMedianOfMedians: summarize(all("sqlite")).median,
  };

  const outDir = path.join(process.cwd(), "scripts", "bench", "results");
  fs.mkdirSync(outDir, { recursive: true });
  const outFile = path.join(outDir, `search-${MODE}.json`);
  fs.writeFileSync(
    outFile,
    JSON.stringify(
      {
        mode: MODE,
        date: new Date().toISOString(),
        iters: ITERS,
        warmup: WARMUP,
        node: process.version,
        cpu: os.cpus()[0]?.model,
        cores: os.cpus().length,
        os: `${os.platform()} ${os.release()}`,
        overall,
        results,
      },
      null,
      2
    )
  );
  console.log(`\nOverall median of per-query medians: legacy ${overall.legacyMedianOfMedians} ms, sqlite ${overall.sqliteMedianOfMedians} ms`);
  console.log(`Wrote ${path.relative(process.cwd(), outFile)}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
