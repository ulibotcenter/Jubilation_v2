/**
 * API Guia / Posição: one query per CPF per Brazilian business day (D-1).
 * Weekends roll back to Friday in America/Sao_Paulo. Failed remote calls
 * still consume the quota — the host was already asked.
 */

export const B3_TZ = "America/Sao_Paulo";

export class B3AlreadyUpdatedError extends Error {
  readonly asOf: string | null;
  constructor(asOf: string | null = null) {
    super("B3 already updated today (D-1)");
    this.name = "B3AlreadyUpdatedError";
    this.asOf = asOf;
  }
}

function partsInSaoPaulo(at: Date): { y: number; m: number; d: number; wd: number } {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: B3_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
  });
  const bits = Object.fromEntries(
    fmt.formatToParts(at).map((p) => [p.type, p.value])
  );
  const wdMap: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  return {
    y: Number(bits.year),
    m: Number(bits.month),
    d: Number(bits.day),
    wd: wdMap[bits.weekday ?? "Mon"] ?? 1,
  };
}

function ymd(y: number, m: number, d: number): string {
  return `${String(y).padStart(4, "0")}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

/** Calendar YYYY-MM-DD in São Paulo. */
export function saoPauloCalendarDate(at: Date): string {
  const p = partsInSaoPaulo(at);
  return ymd(p.y, p.m, p.d);
}

/**
 * Business day of `at`: Mon–Fri in São Paulo. Sat/Sun walk back to Friday.
 */
export function b3BusinessDay(at: Date): string {
  const p = partsInSaoPaulo(at);
  const utc = Date.UTC(p.y, p.m - 1, p.d);
  const back = p.wd === 0 ? 2 : p.wd === 6 ? 1 : 0;
  const shifted = new Date(utc - back * 86_400_000);
  return ymd(
    shifted.getUTCFullYear(),
    shifted.getUTCMonth() + 1,
    shifted.getUTCDate()
  );
}

export function isB3QuotaConsumed(
  lastQueryAt: string | null | undefined,
  now = new Date()
): boolean {
  if (!lastQueryAt) return false;
  const then = new Date(lastQueryAt);
  if (Number.isNaN(then.getTime())) return false;
  return b3BusinessDay(then) === b3BusinessDay(now);
}

export function formatAsOfDayMonth(isoDate: string | null | undefined): string {
  if (!isoDate) return "";
  const day = isoDate.slice(0, 10);
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(day);
  if (!m) return day;
  return `${m[3]}/${m[2]}`;
}

type CachedSnapshot = {
  businessDay: string;
  queriedAt: string;
  body: unknown;
};

const queryCache = new Map<string, CachedSnapshot>();

export function b3QuotaSubject(
  env: Record<string, string | undefined> = process.env
): string {
  const live =
    env.B3_PRODUCTION_INVESTOR_DOCUMENT?.replace(/\D/g, "") ?? "";
  if (live) return `live:${live}`;
  const sandbox =
    env.B3_SANDBOX_INVESTOR_DOCUMENT?.replace(/\D/g, "") ?? "";
  if (sandbox) return `sandbox:${sandbox}`;
  return "fixture";
}

export function peekB3QueryCache(subject: string): CachedSnapshot | undefined {
  return queryCache.get(subject);
}

export function rememberB3Query(input: {
  subject: string;
  now?: Date;
  body: unknown;
}): CachedSnapshot {
  const now = input.now ?? new Date();
  const row: CachedSnapshot = {
    businessDay: b3BusinessDay(now),
    queriedAt: now.toISOString(),
    body: input.body,
  };
  queryCache.set(input.subject, row);
  return row;
}

export function consumeB3QuerySlot(input: {
  subject: string;
  now?: Date;
}):
  | { blocked: false }
  | { blocked: true; cached: CachedSnapshot | undefined } {
  const now = input.now ?? new Date();
  const existing = queryCache.get(input.subject);
  if (existing && existing.businessDay === b3BusinessDay(now)) {
    return { blocked: true, cached: existing };
  }
  return { blocked: false };
}

export function resetB3QueryCacheForTests(): void {
  queryCache.clear();
}
