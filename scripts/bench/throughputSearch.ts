/**
 * Throughput under concurrent load against a running server.
 *   npx tsx scripts/bench/throughputSearch.ts http://localhost:3000 [concurrency=10] [seconds=10]
 * Cycles through the benchmark query mix; reports requests/sec and latency percentiles.
 */
import fs from "node:fs";
import path from "node:path";
import { QUERIES } from "./benchmarkSearch.queries";

const base = process.argv[2] ?? "http://localhost:3000";
const concurrency = Number(process.argv[3] ?? 10);
const seconds = Number(process.argv[4] ?? 10);

async function run(route: string) {
  const lat: number[] = [];
  let errors = 0;
  let next = 0;
  const end = performance.now() + seconds * 1000;
  const worker = async () => {
    while (performance.now() < end) {
      const q = QUERIES[next++ % QUERIES.length];
      const t0 = performance.now();
      try {
        const r = await fetch(`${base}${route}?${q.qs}`, { cache: "no-store" });
        await r.arrayBuffer();
        if (!r.ok) errors++;
      } catch {
        errors++;
      }
      lat.push(performance.now() - t0);
    }
  };
  const t0 = performance.now();
  await Promise.all(Array.from({ length: concurrency }, worker));
  const elapsed = (performance.now() - t0) / 1000;
  lat.sort((a, b) => a - b);
  const p = (x: number) => Math.round(lat[Math.min(lat.length - 1, Math.ceil((x / 100) * lat.length) - 1)] * 10) / 10;
  return { route, requests: lat.length, errors, rps: Math.round((lat.length / elapsed) * 10) / 10, p50: p(50), p95: p(95), p99: p(99) };
}

(async () => {
  const legacy = await run("/api/search-cards-legacy");
  console.log(legacy);
  const sqlite = await run("/api/search-cards");
  console.log(sqlite);
  const out = path.join(process.cwd(), "scripts", "bench", "results", "search-throughput.json");
  fs.writeFileSync(out, JSON.stringify({ date: new Date().toISOString(), base, concurrency, seconds, legacy, sqlite }, null, 2));
  console.log(`throughput ${Math.round((sqlite.rps / legacy.rps) * 10) / 10}x | wrote ${path.relative(process.cwd(), out)}`);
})();
