import {
  householdFromKpis,
  syncHolderWithKpis,
  type Household,
} from "@/lib/engine/household";
import {
  normalizeKpiValues,
  type KPIValues,
  type PortfolioAsset,
} from "@/types";

/** Four fields that produce a real first number. Renda fills today's spend and the retirement income goal until the user edits them. Retirement age stays 65 unless age already passed it. */
export interface OnboardingAnswers {
  age: number;
  income: number;
  contribution: number;
  lifeExpectancy: number;
}

export function kpisFromOnboarding(answers: OnboardingAnswers): KPIValues {
  return normalizeKpiValues({
    currentAge: answers.age,
    monthlyExpenses: answers.income,
    desiredMonthlyIncome: answers.income,
    monthlyContribution: answers.contribution,
    lifeExpectancy: answers.lifeExpectancy,
    retirementAge: 65,
    currentNetWorth: 0,
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

export function emptyHoldings(): PortfolioAsset[] {
  return [];
}
