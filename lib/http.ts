export async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  ms: number
): Promise<Response> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(t);
  }
}

export async function fetchWithRetry(
  url: string,
  init: RequestInit,
  { timeoutMs = 8000, retryDelayMs = 500 }: { timeoutMs?: number; retryDelayMs?: number } = {}
): Promise<Response> {
  try {
    return await fetchWithTimeout(url, init, timeoutMs);
  } catch {
    await sleep(retryDelayMs);
    return await fetchWithTimeout(url, init, timeoutMs);
  }
}
