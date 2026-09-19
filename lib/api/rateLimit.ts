const WINDOW_MS = 60_000;
const MAX_HITS = 30;

const hits = new Map<string, number[]>();

export function rateLimitKey(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || "unknown";
  return request.headers.get("x-real-ip") ?? "unknown";
}

export function allowRequest(key: string, max = MAX_HITS, windowMs = WINDOW_MS): boolean {
  const now = Date.now();
  const prev = hits.get(key) ?? [];
  const recent = prev.filter((t) => now - t < windowMs);
  recent.push(now);
  hits.set(key, recent);
  return recent.length <= max;
}

export function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit & { timeoutMs?: number } = {}
): Promise<Response> {
  const { timeoutMs = 8000, ...rest } = init;
  const signal = AbortSignal.timeout(timeoutMs);
  return fetch(input, { ...rest, signal });
}
