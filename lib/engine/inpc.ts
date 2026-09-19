import { addMonthsYm, parseYearMonth, yearMonthIso } from "@/lib/engine/dates";
import {
  INPC_FIRST_YM,
  INPC_LAST_YM,
  INPC_MONTHLY_PERCENT,
  INPC_SOURCE,
} from "@/lib/engine/inpcMonthly";

export { INPC_FIRST_YM, INPC_LAST_YM, INPC_SOURCE };

/**
 * Cumulative INPC index at the end of `ym` (product of 1+rate from
 * INPC_FIRST_YM through `ym`). Base before 1994-07 is 1.
 *
 * Unpublished months after INPC_LAST_YM keep the last index (0% — named
 * premise: do not invent future INPC).
 */
const INDEX_AT: Record<string, number> = (() => {
  const out: Record<string, number> = {};
  let idx = 1;
  let ym = INPC_FIRST_YM;
  while (ym <= INPC_LAST_YM) {
    const rate = INPC_MONTHLY_PERCENT[ym];
    if (rate == null) break;
    idx *= 1 + rate / 100;
    out[ym] = idx;
    ym = addMonthsYm(ym, 1);
  }
  return out;
})();

function clampToPublished(ym: string): string {
  if (ym < INPC_FIRST_YM) return INPC_FIRST_YM;
  if (ym > INPC_LAST_YM) return INPC_LAST_YM;
  return ym;
}

export function inpcIndexAt(ym: string): number {
  return INDEX_AT[clampToPublished(ym)] ?? 1;
}

export function inpcMonthlyPercent(ym: string): number | undefined {
  return INPC_MONTHLY_PERCENT[ym];
}

/**
 * INPC correction of a competence wage to the month before DIB.
 *
 * Lei 8.213/1991 art. 29-B; IN INSS 77/2015 art. 179: variação integral
 * do INPC até o mês anterior ao início do benefício.
 *
 * Factor = index(DIB−1) / index(competence) = product of monthly INPC
 * from the month after the competence through the month before DIB.
 * The competence's own INPC is not applied (wage already in that month's
 * prices). If the competence is the month before DIB (or later), factor = 1.
 *
 * Months after the last published INPC are treated as 0% (do not invent
 * a closed future rate).
 */
export function inpcCorrectionFactor(
  competenceYm: string,
  dibIsoOrYm: string
): number {
  const dibYm = dibIsoOrYm.slice(0, 7);
  const untilYm = addMonthsYm(dibYm, -1);
  if (competenceYm >= untilYm) return 1;
  const num = inpcIndexAt(untilYm);
  const den = inpcIndexAt(competenceYm);
  return den > 0 ? num / den : 1;
}

/** Inclusive YYYY-MM walk, for tests that rebuild a factor by hand. */
export function yearMonthsInclusive(fromYm: string, toYm: string): string[] {
  const out: string[] = [];
  let { y, m } = parseYearMonth(fromYm);
  const end = parseYearMonth(toYm);
  while (y < end.y || (y === end.y && m <= end.m)) {
    out.push(yearMonthIso(y, m));
    m += 1;
    if (m === 13) {
      y += 1;
      m = 1;
    }
  }
  return out;
}
