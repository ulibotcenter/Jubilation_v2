import type { Currency } from "@/types";
import type { ParameterSet } from "@/lib/engine/parameters";
import { DEFAULT_PARAMETER_SET } from "@/lib/engine/parameters";
import {
  DEFAULT_LIFE_EXPECTANCY_AGE,
  DEFAULT_LONG_RUN_INFLATION,
  DEFAULT_PORTFOLIO_REAL_RETURN,
} from "@/lib/engine/assumptions";
import { ENGINE_VERSION, PARAMETER_SET_VERSION } from "@/lib/engine/version";

export type TaxRegime = "taxable" | "exempt" | "deferred" | "come_cotas";
export type Liquidity = "liquid" | "illiquid";

export interface EnginePlan {
  currentAge: number;
  retirementAge: number;
  lifeExpectancy: number;
  asOf: string;
  currency: Currency;
  liquidCents: number;
  illiquidCents: number;
  /** Real purchasing-power contribution, held constant in a real series */
  monthlyContributionCents: number;
  /** Net monthly retirement spending in today's money */
  monthlySpendingCents: number;
  /** Accumulation-phase living cost (does not leave the portfolio) */
  monthlyLifestyleCents: number;
  liquidRealReturn: number;
  illiquidRealReturn: number;
  inflation: number;
  /** Never true unless the user dated a sale. Fixes M8. */
  allowIlliquidSale: boolean;
  illiquidSaleMonth?: number | null;
  illiquidTransactionCostRate: number;
  /** Manual or estimated INSS (Phase 1 fills the full RGPS module). */
  inssMonthlyCents: number;
  applyTaxes: boolean;
  taxRegime: TaxRegime;
  comeCotasRate: number;
  seed: number;
  parameterSet: ParameterSet;
}

export interface EngineRunMeta {
  engineVersion: string;
  parameterSetVersion: string;
  seed: number;
  asOf: string;
  iterations?: number;
}

export function defaultPlan(overrides: Partial<EnginePlan> = {}): EnginePlan {
  return {
    currentAge: 40,
    retirementAge: 65,
    lifeExpectancy: DEFAULT_LIFE_EXPECTANCY_AGE,
    asOf: "2026-01-01",
    currency: "BRL",
    liquidCents: 0,
    illiquidCents: 0,
    monthlyContributionCents: 0,
    monthlySpendingCents: 0,
    monthlyLifestyleCents: 0,
    liquidRealReturn: DEFAULT_PORTFOLIO_REAL_RETURN,
    illiquidRealReturn: 0,
    inflation: DEFAULT_LONG_RUN_INFLATION,
    allowIlliquidSale: false,
    illiquidSaleMonth: null,
    illiquidTransactionCostRate: 0.06,
    inssMonthlyCents: 0,
    applyTaxes: false,
    taxRegime: "taxable",
    comeCotasRate: 0.15,
    seed: 1,
    parameterSet: DEFAULT_PARAMETER_SET,
    ...overrides,
  };
}

export function planMeta(plan: EnginePlan, iterations?: number): EngineRunMeta {
  return {
    engineVersion: ENGINE_VERSION,
    parameterSetVersion: plan.parameterSet.version || PARAMETER_SET_VERSION,
    seed: plan.seed,
    asOf: plan.asOf,
    iterations,
  };
}

export function asOfYear(asOf: string): number {
  const year = Number(asOf.slice(0, 4));
  return Number.isFinite(year) ? year : new Date().getFullYear();
}
