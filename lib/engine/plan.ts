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
  /** Age-ranged benefit slices (INSS, survivor pension, RendA+). */
  benefits: BenefitSlice[];
  applyTaxes: boolean;
  /**
   * Flat 0–1 rate for uncovered tax homes. Ignored when `applyTaxes`
   * (Brazil IRPF). Empty / missing is 0 — never an invented bracket.
   */
  manualEffectiveTaxRate: number;
  taxRegime: TaxRegime;
  comeCotasRate: number;
  /**
   * Share of liquid wealth in open non-equity funds (IN 1.585 come-cotas).
   * 0 = no fund slice; 1 = whole liquid bucket. Mixed portfolios use a
   * fraction so stocks are not come-cota'd and funds are not skipped.
   */
  comeCotasFraction: number;
  seed: number;
  parameterSet: ParameterSet;
}

export interface BenefitSlice {
  startAge: number;
  endAge: number;
  monthlyCents: number;
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
    benefits: [],
    applyTaxes: false,
    manualEffectiveTaxRate: 0,
    taxRegime: "taxable",
    comeCotasRate: 0.15,
    comeCotasFraction: 0,
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
