import type { PublicIndependenceInput } from "@/lib/calculators/independence";
import { fisherNominal } from "@/lib/engine/rates";
import { normalizeKpiValues, type KPIValues } from "@/types";

/** Map the public freedom inputs onto the local plan KPIs. No API. */
export function kpisFromFreedomInput(
  input: PublicIndependenceInput,
  inflationPercent: number,
  freedomAge: number | null,
  current: KPIValues
): KPIValues {
  const expectedCAGR =
    Math.round(fisherNominal(input.realReturn, inflationPercent / 100) * 1000) /
    10;
  return normalizeKpiValues({
    ...current,
    currentAge: input.currentAge,
    lifeExpectancy: input.lifeExpectancy,
    currentNetWorth: input.liquidWealth,
    monthlyContribution: input.monthlyContribution,
    desiredMonthlyIncome: input.monthlySpending,
    monthlyExpenses: input.monthlySpending,
    annualInflation: inflationPercent,
    expectedCAGR,
    retirementAge: freedomAge ?? current.retirementAge,
  });
}
