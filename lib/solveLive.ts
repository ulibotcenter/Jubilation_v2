import { buildProjectionEngineConfig } from "@/lib/projectionEngine";
import { projectPlan } from "@/lib/engine/project";
import { solvePlan, type SolveResult, type SolveUnknown } from "@/lib/engine/solve";
import type { EnginePlan } from "@/lib/engine/plan";
import { liveFxQuote, type FxSnapshot } from "@/lib/fx/types";
import type { Household } from "@/lib/engine/household";
import type { Currency, KPIValues, PortfolioAsset } from "@/types";

export interface LiveSolveInput {
  kpis: KPIValues;
  portfolio: PortfolioAsset[];
  includedAssetIds: string[];
  outsidePortfolio: number;
  currency: Currency;
  fxSnapshot?: FxSnapshot | null;
  household?: Household | null;
}

/**
 * Max sustainable monthly spending with the retirement date fixed.
 *
 * `solvePlan(..., "income")` searches the wrong way (minimum spend) and a
 * spending of 0 falls back to lifestyle / 4% inside projectPlan. The UI
 * needs the maximum, so this wrapper bisects here and leaves the engine
 * file untouched.
 */
function maxSustainableIncome(plan: EnginePlan): SolveResult {
  const trial = (cents: number) =>
    projectPlan({
      ...plan,
      monthlySpendingCents: Math.round(cents),
      monthlyLifestyleCents: 0,
    }).ruinAge == null;

  const hi = Math.max(
    50_000_00,
    plan.liquidCents / 12,
    plan.monthlyContributionCents * 240,
    1_000_00
  );

  if (!trial(1)) {
    return { unknown: "income", value: 0, iterations: 0, feasible: false };
  }
  if (trial(hi)) {
    return { unknown: "income", value: hi / 100, iterations: 0, feasible: true };
  }

  let a = 1;
  let b = hi;
  let i = 0;
  for (; i < 48; i++) {
    const mid = (a + b) / 2;
    if (trial(mid)) a = mid;
    else b = mid;
    if (b - a < 1) break;
  }
  return {
    unknown: "income",
    value: a / 100,
    iterations: i + 1,
    feasible: true,
  };
}

export function liveSolve(
  input: LiveSolveInput,
  unknown: SolveUnknown
): SolveResult {
  const quote = liveFxQuote(input.currency, input.fxSnapshot);
  const cfg = buildProjectionEngineConfig(
    input.kpis,
    input.portfolio,
    input.includedAssetIds,
    input.outsidePortfolio,
    quote,
    { household: input.household }
  );
  if (unknown === "income") {
    return maxSustainableIncome(cfg.plan);
  }
  return solvePlan(cfg.plan, unknown);
}
