import { buildProjectionEngineConfig } from "@/lib/projectionEngine";
import { solvePlan, type SolveResult, type SolveUnknown } from "@/lib/engine/solve";
import { liveFxQuote, type FxSnapshot } from "@/lib/fx/types";
import type { Household } from "@/lib/engine/household";
import type { Country, Currency, KPIValues, PortfolioAsset } from "@/types";
import { engineApplyTaxes } from "@/lib/onboarding/country";
import {
  isCoveredTaxHome,
  resolveManualTaxRatePct,
} from "@/lib/tax/manual";

export interface LiveSolveInput {
  kpis: KPIValues;
  portfolio: PortfolioAsset[];
  includedAssetIds: string[];
  outsidePortfolio: number;
  currency: Currency;
  fxSnapshot?: FxSnapshot | null;
  household?: Household | null;
  country?: Country;
  manualEffectiveTaxRatePct?: number | null;
}

/**
 * UI adapter: build a plan from live state and ask the engine.
 * Income, date, and contribution all go through `solvePlan` — one path.
 */
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
    {
      household: input.household,
      applyTaxes: input.country ? engineApplyTaxes(input.country) : true,
      manualEffectiveTaxRate:
        input.country && !isCoveredTaxHome(input.country)
          ? resolveManualTaxRatePct(
              input.country,
              input.manualEffectiveTaxRatePct
            ) / 100
          : 0,
    }
  );
  return solvePlan(cfg.plan, unknown);
}
