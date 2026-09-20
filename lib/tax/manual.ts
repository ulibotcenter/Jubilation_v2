import type { Country } from "@/types";

/** Only Brazil has a real tax engine today. Everyone else is uncovered. */
export const COVERED_TAX_HOMES = ["BR"] as const;

export type CoveredTaxHome = (typeof COVERED_TAX_HOMES)[number];

export function isCoveredTaxHome(country: Country): boolean {
  return (COVERED_TAX_HOMES as readonly string[]).includes(country);
}

/** Optional % field — never on the BR happy path. */
export function showsManualTaxRate(country: Country): boolean {
  return !isCoveredTaxHome(country);
}

/** Empty / NaN → null. Stored value, not an invented rate. */
export function parseManualTaxRatePct(raw: unknown): number | null {
  if (raw === "" || raw == null) return null;
  const n =
    typeof raw === "number"
      ? raw
      : Number(String(raw).trim().replace(",", "."));
  if (!Number.isFinite(n)) return null;
  return Math.min(100, Math.max(0, n));
}

/**
 * Rate the projection and preview may use.
 * Covered homes (BR) always resolve to 0 here — IRPF stays in the engine.
 * Uncovered + empty → 0. Never 28% or a foreign bracket table.
 */
export function resolveManualTaxRatePct(
  country: Country,
  raw: number | null | undefined
): number {
  if (isCoveredTaxHome(country)) return 0;
  return parseManualTaxRatePct(raw) ?? 0;
}
