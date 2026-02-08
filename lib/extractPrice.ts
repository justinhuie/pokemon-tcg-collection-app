import type { PokemonCard } from "./types";

const TCGLIKE_VARIANTS = [
  "normal",
  "holofoil",
  "reverseHolofoil",
  "1stEditionHolofoil",
  "1stEditionNormal",
] as const;

export function extractTcgplayerMarket(
  card: PokemonCard,
  preferredVariant?: string
) {
  const prices = card.tcgplayer?.prices;
  if (!prices) return null;

  const variants = Object.keys(prices);

  const pick =
    (preferredVariant &&
      prices[preferredVariant]?.market != null &&
      preferredVariant) ||
    variants.find(v => prices[v]?.market != null) ||
    TCGLIKE_VARIANTS.find(v => prices[v]?.market != null);

  if (!pick) return null;

  return {
    provider: "tcgplayer" as const,
    variant: pick,
    price: prices[pick].market!,
    currency: "USD" as const,
    providerUpdatedAt: card.tcgplayer?.updatedAt ?? null,
  };
}

export function extractCardmarketTrend(card: PokemonCard) {
  const cm = card.cardmarket;
  const p = cm?.prices;
  if (!p) return null;

  const value =
    p.trendPrice ??
    p.averageSellPrice ??
    p.avg7 ??
    p.avg30 ??
    null;

  if (value == null) return null;

  return {
    provider: "cardmarket" as const,
    variant: "trend" as const,
    price: value,
    currency: "EUR" as const,
    providerUpdatedAt: cm?.updatedAt ?? null,
  };
}
