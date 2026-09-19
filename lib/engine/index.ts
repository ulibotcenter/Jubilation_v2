export { ENGINE_VERSION, PARAMETER_SET_VERSION } from "@/lib/engine/version";
export { createId } from "@/lib/engine/ids";
export {
  money,
  fromMajor,
  toMajor,
  addMoney,
  convertMoney,
  CurrencyMismatchError,
  MissingFxRateError,
} from "@/lib/engine/money";
export { fisherReal, fisherNominal, annualToMonthly } from "@/lib/engine/rates";
export { ASSUMPTIONS, assumptionImpact, DEFAULT_LIFE_EXPECTANCY_AGE } from "@/lib/engine/assumptions";
export { DEFAULT_PARAMETER_SET, paramsForYear } from "@/lib/engine/parameters";
export { calculateMonthlyIrpf, calculateAnnualIrpf } from "@/lib/engine/tax";
export { retirementTarget } from "@/lib/engine/target";
export { defaultPlan, type EnginePlan } from "@/lib/engine/plan";
export { projectPlan, projectYears } from "@/lib/engine/project";
export { runMonteCarloFromPlan, runMonteCarloPlan, percentile } from "@/lib/engine/monteCarlo";
export { runStressOnPlan } from "@/lib/engine/stress";
export { solvePlan } from "@/lib/engine/solve";
export { buildEnginePlan, aggregatePortfolioMajor } from "@/lib/engine/adapter";
export { normalizePortfolioAssets, resolveLiquidity } from "@/lib/engine/liquidity";
