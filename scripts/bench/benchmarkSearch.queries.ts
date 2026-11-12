// Query mix shared by the search benchmarks.
export type Query = { key: string; label: string; qs: string };

export const QUERIES: Query[] = [
  { key: "common", label: "Common name (pikachu)", qs: "q=pikachu" },
  { key: "popular", label: "Popular name (charizard)", qs: "q=charizard" },
  { key: "prefix", label: "Short prefix (char)", qs: "q=char" },
  { key: "multi", label: "Two words (mewtwo ex)", qs: "q=mewtwo%20ex" },
  { key: "rare", label: "Rare name (spiritomb)", qs: "q=spiritomb" },
  { key: "none", label: "No matches (zzqx)", qs: "q=zzqx" },
  { key: "type", label: "Type filter (Fire)", qs: "type=Fire" },
  { key: "set", label: "Set filter + number sort", qs: "set=base1&sort=number" },
  { key: "rarity", label: "Rarity filter + set sort", qs: "rarity=Rare%20Holo&sort=set" },
  { key: "combo", label: "Text + type + set sort", qs: "q=pikachu&type=Lightning&sort=set" },
  { key: "deep", label: "Deep page (Water, page 20)", qs: "type=Water&page=20" },
];
