import type { Sex } from "@/lib/engine/inssTypes";

/**
 * Compact IBGE Complete Mortality Table 2024 (published Dec 2025).
 * Anchors (remaining life e(x)):
 *   e(0)  M 73.3 / F 79.9
 *   e(60) M 20.8 / F 24.2
 *   e(65) M 17.2 / F 20.1
 * Intermediate ages are linearly interpolated between those anchors, then
 * ~0.72 yr/yr after 65 (the 60→65 slope). Full q(x)/l(x)/T(x) loading is a
 * later phase; factor previdenciário tests use the published e(60)/e(65).
 *
 * Source: IBGE Tábua Completa de Mortalidade 2024; Decreto 3.266/1999.
 */
const ANCHORS: Record<Sex, Array<{ age: number; ex: number }>> = {
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
};

const POST_65_SLOPE = (20.8 - 17.2) / 5;

export const MORTALITY_TABLE_ID = "ibge-2024-compact";
export const MORTALITY_SOURCE =
  "IBGE Tábua Completa de Mortalidade 2024 (divulgada dez/2025)";

export function expectedRemainingYears(sex: Sex, age: number): number {
  const a = Math.max(0, age);
  const points = ANCHORS[sex];
  if (a >= 65) {
    const at65 = points[points.length - 1]!.ex;
    return Math.max(1, at65 - POST_65_SLOPE * (a - 65));
  }
  for (let i = 1; i < points.length; i++) {
    const lo = points[i - 1]!;
    const hi = points[i]!;
    if (a <= hi.age) {
      const t = (a - lo.age) / (hi.age - lo.age);
      return lo.ex + t * (hi.ex - lo.ex);
    }
  }
  return points[points.length - 1]!.ex;
}
