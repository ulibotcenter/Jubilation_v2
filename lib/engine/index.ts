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
  IdentityFxRatesError,
} from "@/lib/engine/money";
export { fisherReal, fisherNominal, annualToMonthly } from "@/lib/engine/rates";
export { ASSUMPTIONS, assumptionImpact, DEFAULT_LIFE_EXPECTANCY_AGE } from "@/lib/engine/assumptions";
export { DEFAULT_PARAMETER_SET, paramsForYear, DEFAULT_LEGAL_PREMISES } from "@/lib/engine/parameters";
export { calculateMonthlyIrpf, calculateAnnualIrpf } from "@/lib/engine/tax";
export {
  evaluateInss,
  fillContributionRange,
  fatorPrevidenciario,
  fatorPrevidenciarioLegal,
  fatorTcBonusYears,
  FATOR_PREVIDENCIARIO_SOURCE,
  rgpsCoefficient,
} from "@/lib/engine/inss";
export { contributorCharge, complementToNormal } from "@/lib/engine/contributor";
export { redeemLots, pgblDeduction } from "@/lib/engine/previdencia";
export { comeCotasRate, comeCotasApplies, comeCotasLevyCents } from "@/lib/engine/comeCotas";
export { survivorPension } from "@/lib/engine/survivorPension";
export {
  lastSurvivorAgeInHolderYears,
  ownershipInScope,
  defaultHousehold,
  householdFromKpis,
  createPerson,
} from "@/lib/engine/household";
export type { Household, HouseholdScope, Person } from "@/lib/engine/household";
export { projectFgtsYear, fgtsBirthdayOneBracketCents } from "@/lib/engine/fgts";
export { rendaMaisMonthlyParcelCents, RENDA_MAIS_INSTALLMENTS } from "@/lib/engine/rendaMais";
export { retirementTarget } from "@/lib/engine/target";
export { defaultPlan, type EnginePlan } from "@/lib/engine/plan";
export { projectPlan, projectYears } from "@/lib/engine/project";
export { runMonteCarloFromPlan, runMonteCarloPlan, percentile } from "@/lib/engine/monteCarlo";
export { runStressOnPlan } from "@/lib/engine/stress";
export { solvePlan } from "@/lib/engine/solve";
export { buildEnginePlan, aggregatePortfolioMajor } from "@/lib/engine/adapter";
export { normalizePortfolioAssets, resolveLiquidity } from "@/lib/engine/liquidity";
