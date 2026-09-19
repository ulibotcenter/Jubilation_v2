import type { Sex } from "@/lib/engine/inssTypes";

/**
 * Compact IBGE Complete Mortality Table 2024 (published Dec 2025).
 * Anchors (remaining life e(x)):
 *   e(0)  both 76.6 / M 73.3 / F 79.9
 *   e(60) both 22.6 / M 20.8 / F 24.2
 *   e(65) M 17.2 / F 20.1; both-sexes e(65) is not in the IBGE highlight
 *   table — compact uses the mean of the published sex-specific values (18.65).
 * Intermediate ages are linearly interpolated between those anchors, then
 * the 60→65 slope after 65.
 *
 * Lei 9.876/1999 §8º: the fator previdenciário uses the **both-sexes**
 * national average Es, not the sex-specific e(x). Sex-specific values remain
 * for longevity planning.
 *
 * Source: IBGE Tábua Completa de Mortalidade 2024; Decreto 3.266/1999;
 * benchmark §4.10 (e(60) total 22.6).
 */
const ANCHORS: Record<Sex | "both", Array<{ age: number; ex: number }>> = {
  M: [
    { age: 0, ex: 73.3 },
    { age: 60, ex: 20.8 },
    { age: 65, ex: 17.2 },
  ],
  F: [
    { age: 0, ex: 79.9 },
    { age: 60, ex: 24.2 },
    { age: 65, ex: 20.1 },
  ],
  both: [
    { age: 0, ex: 76.6 },
    { age: 60, ex: 22.6 },
    { age: 65, ex: 18.65 },
  ],
};

/** IBGE 2024 published e(60) for both sexes — Lei 9.876 §8º Es at 60. */
export const IBGE_2024_E60_BOTH_SEXES = 22.6;
export const IBGE_2024_E60_WOMAN = 24.2;
export const IBGE_2024_E60_MAN = 20.8;

export const MORTALITY_TABLE_ID = "ibge-2024-compact";
export const MORTALITY_SOURCE =
  "IBGE Tábua Completa de Mortalidade 2024 (divulgada dez/2025)";

function remainingFromAnchors(
  points: Array<{ age: number; ex: number }>,
  age: number
): number {
  const a = Math.max(0, age);
  const last = points[points.length - 1]!;
  const prev = points[points.length - 2]!;
  const post65Slope = (prev.ex - last.ex) / (last.age - prev.age);
  if (a >= last.age) {
    return Math.max(1, last.ex - post65Slope * (a - last.age));
  }
  for (let i = 1; i < points.length; i++) {
    const lo = points[i - 1]!;
    const hi = points[i]!;
    if (a <= hi.age) {
      const t = (a - lo.age) / (hi.age - lo.age);
      return lo.ex + t * (hi.ex - lo.ex);
    }
  }
  return last.ex;
}

export function expectedRemainingYears(sex: Sex, age: number): number {
  return remainingFromAnchors(ANCHORS[sex], age);
}

/** Lei 9.876/1999 §8º — Es for the fator previdenciário. */
export function expectedRemainingYearsBothSexes(age: number): number {
  return remainingFromAnchors(ANCHORS.both, age);
}
