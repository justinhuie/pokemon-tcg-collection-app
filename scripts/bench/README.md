# Search benchmarks

Compares the original JSON-scan search (`legacySearchRoute.ts`, kept verbatim) with the
SQLite FTS5 implementation in `app/api/search-cards/route.ts`.

## In-process (no server)

```bash
npm run bench:search            # 100 iterations/query + full result-parity check
```

## End-to-end HTTP and throughput

The HTTP runs need the legacy handler served next to the new one. Temporarily add
`app/api/search-cards-legacy/route.ts`:

```ts
export { GET } from "../../../scripts/bench/legacySearchRoute";
export const runtime = "nodejs";
```

Then:

```bash
npx next build --webpack && npx next start -p 3123
npx tsx scripts/bench/benchmarkSearch.ts --http http://localhost:3123
npx tsx scripts/bench/throughputSearch.ts http://localhost:3123 10 10
```

Delete the temporary route (and `.next/`) afterwards. Results are written to `results/`.
