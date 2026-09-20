import {
  householdFromKpis,
  syncHolderWithKpis,
  type Household,
} from "@/lib/engine/household";
import type { AppLocale } from "@/lib/i18n/messages";
import {
  DEFAULT_LIFE_EXPECTANCY,
  normalizeKpiValues,
  type Country,
  type Currency,
  type KPIValues,
} from "@/types";
import { emptyHoldings } from "@/lib/onboarding/seed";

/** First-screen micro-assessment. Salary, COL and savings stay for a later refine. */
export interface OnboardingAnswers {
  country: Country;
  locale: AppLocale;
  currency: Currency;
  age: number;
  retirementAge: number;
}

export const DEFAULT_ONBOARDING_RETIREMENT_AGE = 90;

export function kpisFromOnboarding(answers: OnboardingAnswers): KPIValues {
  return normalizeKpiValues({
    currentAge: answers.age,
    retirementAge: answers.retirementAge,
    lifeExpectancy: Math.max(DEFAULT_LIFE_EXPECTANCY, answers.retirementAge),
    currentNetWorth: 0,
    monthlyContribution: 0,
    monthlyExpenses: 0,
    desiredMonthlyIncome: 0,
  });
}

export function householdFromOnboarding(
  answers: OnboardingAnswers,
  asOf: string,
  current?: Household | null
): Household {
  const kpis = kpisFromOnboarding(answers);
  const base = current
    ? syncHolderWithKpis(current, kpis, asOf)
    : householdFromKpis(kpis, asOf);
  return {
    ...base,
    holder: {
      ...base.holder,
      displayName:
        base.holder.displayName && base.holder.displayName !== "You"
          ? base.holder.displayName
          : "Você",
    },
  };
}

export { emptyHoldings };
