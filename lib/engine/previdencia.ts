import { previdenciaRegressiveRate } from "@/lib/engine/tax";
import { DEFAULT_PARAMETER_SET, paramsForYear, type ParameterSet } from "@/lib/engine/parameters";
import { createId } from "@/lib/engine/ids";

export type PrevidenciaVehicle = "pgbl" | "vgbl";
export type PrevidenciaRegime = "regressive" | "progressive";
export type LotOrder = "fifo" | "lifo";

export interface PrevidenciaLot {
  id: string;
  contributedOn: string;
  principalCents: number;
  gainCents: number;
  vehicle: PrevidenciaVehicle;
}

export interface RedeemedSlice {
  lotId: string;
  contributedOn: string;
  amountCents: number;
  taxableCents: number;
  yearsHeld: number;
  rate: number;
  taxCents: number;
}

export interface PgblDeductionInput {
  taxableIncomeCents: number;
  contributionCents: number;
  hasTaxableIncome: boolean;
  completeDeclaration: boolean;
  rgpsOrRppsContributor: boolean;
  year?: number;
  parameterSet?: ParameterSet;
}

export interface PgblDeductionResult {
  qualifies: boolean;
  missing: string[];
  capCents: number;
  deductibleCents: number;
  excessCents: number;
  doubleTaxWarning: boolean;
  source: string;
}

function yearsBetween(fromIso: string, toIso: string): number {
  const from = Date.parse(`${fromIso.slice(0, 10)}T00:00:00Z`);
  const to = Date.parse(`${toIso.slice(0, 10)}T00:00:00Z`);
  return Math.max(0, (to - from) / (365.25 * 24 * 3600 * 1000));
}

export function createLot(
  partial: Omit<PrevidenciaLot, "id"> & { id?: string }
): PrevidenciaLot {
  return { id: partial.id ?? createId("lot"), ...partial };
}

/**
 * Lei 11.053/2004: regressive table is per contribution lot, from that
 * lot's date to the payment date — not the plan's age.
 */
export function redeemLots(
  lots: PrevidenciaLot[],
  redeemCents: number,
  redeemedOn: string,
  options: {
    order?: LotOrder;
    regime?: PrevidenciaRegime;
  } = {}
): { slices: RedeemedSlice[]; remaining: PrevidenciaLot[] } {
  const order = options.order ?? "fifo";
  const regime = options.regime ?? "regressive";
  const queue = [...lots].sort((a, b) =>
    order === "fifo"
      ? a.contributedOn.localeCompare(b.contributedOn)
      : b.contributedOn.localeCompare(a.contributedOn)
  );
  let left = Math.max(0, Math.round(redeemCents));
  const slices: RedeemedSlice[] = [];
  const remaining: PrevidenciaLot[] = [];

  for (const lot of queue) {
    const lotTotal = lot.principalCents + lot.gainCents;
    if (left <= 0 || lotTotal <= 0) {
      remaining.push(lot);
      continue;
    }
    const take = Math.min(left, lotTotal);
    const gainShare = lotTotal > 0 ? lot.gainCents / lotTotal : 0;
    const taxable =
      lot.vehicle === "pgbl" ? take : Math.round(take * gainShare);
    const yearsHeld = yearsBetween(lot.contributedOn, redeemedOn);
    const rate =
      regime === "progressive" ? 0.15 : previdenciaRegressiveRate(yearsHeld);
    slices.push({
      lotId: lot.id,
      contributedOn: lot.contributedOn,
      amountCents: take,
      taxableCents: taxable,
      yearsHeld,
      rate,
      taxCents: Math.round(taxable * rate),
    });
    left -= take;
    const rest = lotTotal - take;
    if (rest > 0) {
      const principalShare = lot.principalCents / lotTotal;
      remaining.push({
        ...lot,
        principalCents: Math.round(rest * principalShare),
        gainCents: rest - Math.round(rest * principalShare),
      });
    }
  }

  return { slices, remaining };
}

/**
 * 12% of taxable income, only if all three requirements hold
 * (Lei 9.532/1997 + RIR). Excess is not deductible and is taxed again
 * on PGBL redemption (double tax).
 */
export function pgblDeduction(input: PgblDeductionInput): PgblDeductionResult {
  const set = input.parameterSet ?? DEFAULT_PARAMETER_SET;
  const year = input.year ?? 2026;
  const capRate = paramsForYear(set, year).pgblDeductionRate;
  const missing: string[] = [];
  if (!input.hasTaxableIncome) missing.push("taxable_income");
  if (!input.completeDeclaration) missing.push("complete_declaration");
  if (!input.rgpsOrRppsContributor) missing.push("rgps_or_rpps");
  const qualifies = missing.length === 0;
  const capCents = qualifies
    ? Math.round(Math.max(0, input.taxableIncomeCents) * capRate)
    : 0;
  const contribution = Math.max(0, input.contributionCents);
  const deductibleCents = qualifies ? Math.min(contribution, capCents) : 0;
  const excessCents = contribution - deductibleCents;
  return {
    qualifies,
    missing,
    capCents,
    deductibleCents,
    excessCents,
    doubleTaxWarning: excessCents > 0,
    source:
      "Lei 9.532/1997 art. 11; limite 12% da renda tributável — PGBL código 36",
  };
}
