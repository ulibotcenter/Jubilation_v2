import type { KPIValues } from "@/types";

/** Map the public calculator numbers onto the existing local plan KPIs. */
export function freedomInputsToKpis(input: {
  currentAge: number;
  liquidWealth: number;
  monthlyContribution: number;
  monthlySpending: number;
  lifeExpectancy: number;
  inflationPercent: number;
  freedomAge?: number | null;
}): Partial<KPIValues> {
  const patch: Partial<KPIValues> = {
    currentAge: input.currentAge,
    currentNetWorth: input.liquidWealth,
    monthlyContribution: input.monthlyContribution,
    desiredMonthlyIncome: input.monthlySpending,
    lifeExpectancy: input.lifeExpectancy,
    annualInflation: input.inflationPercent,
  };
  if (input.freedomAge != null && Number.isFinite(input.freedomAge)) {
    patch.retirementAge = Math.round(input.freedomAge);
  }
  return patch;
}
