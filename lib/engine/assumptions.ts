export type AssumptionImpact = "simple" | "high";

export interface AssumptionDef {
  id: string;
  /** i18n key consumed by the existing KPI / settings UI */
  labelKey: string;
  defaultValue: number;
  min: number;
  max: number;
  step: number;
  unit: "years" | "percent" | "currency" | "enum";
  impact: AssumptionImpact;
  /** Why the default is what it is — shown as a quiet hint, never a blocker */
  rationaleKey: string;
}

/**
 * Named, ranged, impact-tagged premises. The engine reads these; the UI
 * only renders them. High-impact edits are allowed — they just look different.
 */
export const ASSUMPTIONS = {
  currentAge: {
    id: "currentAge",
    labelKey: "kpi.field.currentAge",
    defaultValue: 42,
    min: 18,
    max: 80,
    step: 1,
    unit: "years",
    impact: "simple",
    rationaleKey: "assumption.rationale.currentAge",
  },
  retirementAge: {
    id: "retirementAge",
    labelKey: "kpi.field.retirementAge",
    defaultValue: 65,
    min: 40,
    max: 90,
    step: 1,
    unit: "years",
    impact: "simple",
    rationaleKey: "assumption.rationale.retirementAge",
  },
  lifeExpectancy: {
    id: "lifeExpectancy",
    labelKey: "kpi.field.lifeExpectancy",
    defaultValue: 90,
    min: 55,
    max: 120,
    step: 1,
    unit: "years",
    impact: "high",
    rationaleKey: "assumption.rationale.lifeExpectancy",
  },
  monthlyContribution: {
    id: "monthlyContribution",
    labelKey: "kpi.field.monthlyContribution",
    defaultValue: 0,
    min: 0,
    max: 500_000,
    step: 100,
    unit: "currency",
    impact: "simple",
    rationaleKey: "assumption.rationale.contribution",
  },
  monthlyExpenses: {
    id: "monthlyExpenses",
    labelKey: "kpi.field.monthlyExpenses",
    defaultValue: 0,
    min: 0,
    max: 500_000,
    step: 100,
    unit: "currency",
    impact: "simple",
    rationaleKey: "assumption.rationale.expenses",
  },
  desiredMonthlyIncome: {
    id: "desiredMonthlyIncome",
    labelKey: "kpi.field.desiredMonthlyIncome",
    defaultValue: 0,
    min: 0,
    max: 500_000,
    step: 100,
    unit: "currency",
    impact: "simple",
    rationaleKey: "assumption.rationale.income",
  },
  realReturn: {
    id: "realReturn",
    labelKey: "kpi.field.expectedCAGR",
    defaultValue: 4,
    min: -5,
    max: 20,
    step: 0.1,
    unit: "percent",
    impact: "high",
    rationaleKey: "assumption.rationale.realReturn",
  },
  inflation: {
    id: "inflation",
    labelKey: "kpi.field.annualInflation",
    defaultValue: 3,
    min: 0,
    max: 20,
    step: 0.1,
    unit: "percent",
    impact: "high",
    rationaleKey: "assumption.rationale.inflation",
  },
  indexedBondRealReturn: {
    id: "indexedBondRealReturn",
    labelKey: "assumption.indexedBondRealReturn",
    defaultValue: 6,
    min: 0,
    max: 12,
    step: 0.1,
    unit: "percent",
    impact: "high",
    rationaleKey: "assumption.rationale.indexedBond",
  },
  fgtsRealReturn: {
    id: "fgtsRealReturn",
    labelKey: "assumption.fgtsRealReturn",
    defaultValue: 0,
    min: -3,
    max: 4,
    step: 0.1,
    unit: "percent",
    impact: "high",
    rationaleKey: "assumption.rationale.fgts",
  },
  minimumWageRealGrowth: {
    id: "minimumWageRealGrowth",
    labelKey: "assumption.minimumWageRealGrowth",
    defaultValue: 0,
    min: -2,
    max: 3,
    step: 0.1,
    unit: "percent",
    impact: "high",
    rationaleKey: "assumption.rationale.minimumWage",
  },
  requireSpecialPoints: {
    id: "requireSpecialPoints",
    labelKey: "assumption.requireSpecialPoints",
    defaultValue: 1,
    min: 0,
    max: 1,
    step: 1,
    unit: "enum",
    impact: "high",
    rationaleKey: "assumption.rationale.specialPoints",
  },
  maleByAgeTminYears: {
    id: "maleByAgeTminYears",
    labelKey: "assumption.maleByAgeTmin",
    defaultValue: 20,
    min: 15,
    max: 20,
    step: 1,
    unit: "years",
    impact: "high",
    rationaleKey: "assumption.rationale.maleByAgeTmin",
  },
} as const satisfies Record<string, AssumptionDef>;

export type AssumptionId = keyof typeof ASSUMPTIONS;

export const DEFAULT_LIFE_EXPECTANCY_AGE = ASSUMPTIONS.lifeExpectancy.defaultValue;
export const DEFAULT_PORTFOLIO_REAL_RETURN =
  ASSUMPTIONS.realReturn.defaultValue / 100;
export const DEFAULT_LONG_RUN_INFLATION = ASSUMPTIONS.inflation.defaultValue / 100;

export function assumptionImpact(
  field: string
): AssumptionImpact {
  if (field === "expectedCAGR" || field === "annualInflation") return "high";
  if (field === "lifeExpectancy") return "high";
  const def = (ASSUMPTIONS as Record<string, AssumptionDef | undefined>)[field];
  return def?.impact ?? "simple";
}

export function clampAssumption(id: AssumptionId, value: number): number {
  const def = ASSUMPTIONS[id];
  return Math.min(def.max, Math.max(def.min, value));
}
