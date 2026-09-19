/** Pure ISO date helpers for the legal engine. No Date.now(). */

export interface Ymd {
  y: number;
  m: number;
  d: number;
}

export function parseIso(iso: string): Ymd {
  const y = Number(iso.slice(0, 4));
  const m = Number(iso.slice(5, 7));
  const d = Number(iso.slice(8, 10) || "01");
  return {
    y: Number.isFinite(y) ? y : 2026,
    m: Number.isFinite(m) ? m : 1,
    d: Number.isFinite(d) ? d : 1,
  };
}

export function toIso(ymd: Ymd): string {
  const mm = String(ymd.m).padStart(2, "0");
  const dd = String(ymd.d).padStart(2, "0");
  return `${ymd.y}-${mm}-${dd}`;
}

export function parseYearMonth(ym: string): { y: number; m: number } {
  const y = Number(ym.slice(0, 4));
  const m = Number(ym.slice(5, 7));
  return { y: Number.isFinite(y) ? y : 2026, m: Number.isFinite(m) ? m : 1 };
}

export function yearMonthIso(y: number, m: number): string {
  return `${y}-${String(m).padStart(2, "0")}`;
}

/** Inclusive month count from YYYY-MM to YYYY-MM. */
export function monthsInclusive(fromYm: string, toYm: string): number {
  const a = parseYearMonth(fromYm);
  const b = parseYearMonth(toYm);
  return (b.y - a.y) * 12 + (b.m - a.m) + 1;
}

export function addMonthsYm(ym: string, delta: number): string {
  const { y, m } = parseYearMonth(ym);
  const idx = y * 12 + (m - 1) + delta;
  const ny = Math.floor(idx / 12);
  const nm = (idx % 12) + 1;
  return yearMonthIso(ny, nm);
}

export function addMonthsIso(iso: string, delta: number): string {
  const { y, m, d } = parseIso(iso);
  const idx = y * 12 + (m - 1) + delta;
  const ny = Math.floor(idx / 12);
  const nm = (idx % 12) + 1;
  return toIso({ y: ny, m: nm, d });
}

export function compareIso(a: string, b: string): number {
  return a.slice(0, 10) < b.slice(0, 10)
    ? -1
    : a.slice(0, 10) > b.slice(0, 10)
      ? 1
      : 0;
}

/** Age in complete months at `asOf` (birthday not yet reached this month → −1). */
export function ageInMonths(birthIso: string, asOfIso: string): number {
  const b = parseIso(birthIso);
  const a = parseIso(asOfIso);
  let months = (a.y - b.y) * 12 + (a.m - b.m);
  if (a.d < b.d) months -= 1;
  return months;
}

export function completeYears(months: number): number {
  return Math.floor(Math.max(0, months) / 12);
}

export function isoFromAgeMonths(birthIso: string, ageMonths: number): string {
  return addMonthsIso(birthIso, ageMonths);
}
