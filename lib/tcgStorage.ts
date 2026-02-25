// lib/tcgStorage.ts
export const WISHLIST_KEY = "ptcg:wishlist:v1";
export const COLLECTION_KEY = "ptcg:collection:v1";

const EVENT_NAME = "ptcg:storage";

function emitChange() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(EVENT_NAME));
}

function safeParse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}


export function getWishlistIds(): string[] {
  if (typeof window === "undefined") return [];
  const parsed = safeParse<unknown>(localStorage.getItem(WISHLIST_KEY));
  if (!Array.isArray(parsed)) return [];
  const out: string[] = [];
  for (const v of parsed) {
    if (typeof v === "string" && v.trim()) out.push(v);
  }
  return out;
}

export function isWishlisted(cardId: string): boolean {
  return getWishlistIds().includes(cardId);
}

export function addToWishlist(cardId: string) {
  if (typeof window === "undefined") return;
  const ids = new Set(getWishlistIds());
  ids.add(cardId);
  localStorage.setItem(WISHLIST_KEY, JSON.stringify(Array.from(ids)));
  emitChange();
}

export function removeFromWishlist(cardId: string) {
  if (typeof window === "undefined") return;
  const ids = getWishlistIds().filter((id) => id !== cardId);
  localStorage.setItem(WISHLIST_KEY, JSON.stringify(ids));
  emitChange();
}

export function toggleWishlist(cardId: string) {
  if (isWishlisted(cardId)) removeFromWishlist(cardId);
  else addToWishlist(cardId);
}


export function getCollectionMap(): Record<string, number> {
  if (typeof window === "undefined") return {};
  const parsed = safeParse<unknown>(localStorage.getItem(COLLECTION_KEY));
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};

  const obj = parsed as Record<string, unknown>;
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (typeof k !== "string" || !k.trim()) continue;
    if (typeof v === "number" && Number.isFinite(v) && v > 0) out[k] = Math.floor(v);
  }
  return out;
}

export function getOwnedQty(cardId: string): number {
  const map = getCollectionMap();
  return map[cardId] ?? 0;
}

export function setOwnedQty(cardId: string, qty: number) {
  if (typeof window === "undefined") return;
  const map = getCollectionMap();
  const q = Math.max(0, Math.floor(qty));

  if (q <= 0) delete map[cardId];
  else map[cardId] = q;

  localStorage.setItem(COLLECTION_KEY, JSON.stringify(map));
  emitChange();
}

export function incrementOwned(cardId: string, delta: number) {
  const cur = getOwnedQty(cardId);
  setOwnedQty(cardId, cur + delta);
}

export function subscribeToStorageChange(cb: () => void) {
  if (typeof window === "undefined") return () => {};
  const onStorage = (e: StorageEvent) => {
    if (e.key === WISHLIST_KEY || e.key === COLLECTION_KEY) cb();
  };
  const onCustom = () => cb();

  window.addEventListener("storage", onStorage);
  window.addEventListener(EVENT_NAME, onCustom);

  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(EVENT_NAME, onCustom);
  };
}