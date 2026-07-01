import {
  generateChartData,
  type ChartDataPoint,
  type KPIValues,
  type ProjectionYear,
} from "@/types";

/** @deprecated Use kpis.lifeExpectancy — kept for test fallbacks */
export const PROJECTION_END_AGE = 90;

/** Accumulation + drawdown through user-defined life expectancy */
export function generateExtendedProjections(kpis: KPIValues): ProjectionYear[] {
  const projections: ProjectionYear[] = [];
  const annualContribution = kpis.monthlyContribution * 12;
  const annualLiving = kpis.monthlyExpenses * 12;
  const realReturn = (kpis.expectedCAGR - kpis.annualInflation) / 100;
  const endAge = kpis.lifeExpectancy;

  let portfolioValue = kpis.currentNetWorth;
  let annualWithdrawal = 0;
  const startYear = new Date().getFullYear();

  for (let age = kpis.currentAge; age <= endAge; age++) {
    const i = age - kpis.currentAge;
    const year = startYear + i;
    const isRetired = age >= kpis.retirementAge;
    const returns = i === 0 ? 0 : portfolioValue * realReturn;
    const contributions = i === 0 || isRetired ? 0 : annualContribution;
    const expenses = i === 0 ? 0 : isRetired ? 0 : annualLiving;

    if (isRetired && annualWithdrawal === 0) {
      annualWithdrawal =
        kpis.desiredMonthlyIncome > 0
          ? kpis.desiredMonthlyIncome * 12
          : Math.round(portfolioValue * 0.04);
    }

    const withdrawals = i === 0 || !isRetired ? 0 : annualWithdrawal;
    const invested = contributions;
    const requiredIncome = expenses + invested;

    if (i > 0) {
      portfolioValue =
        portfolioValue + returns + contributions - withdrawals;
      portfolioValue = Math.max(0, portfolioValue);
    }

    const inflationFactor = Math.pow(1 + kpis.annualInflation / 100, i);

    projections.push({
      year,
      age,
      portfolioValue: Math.round(portfolioValue),
      contributions: Math.round(contributions),
      returns: Math.round(returns),
      inflationAdjusted: Math.round(portfolioValue / inflationFactor),
      expenses: Math.round(expenses + withdrawals),
      invested: Math.round(invested),
      requiredIncome: Math.round(requiredIncome),
    });
  }

  return projections;
}

export function chartDataWithMcBands(
  projections: ProjectionYear[],
  mcP10?: number,
  mcP90?: number,
  anchorAge?: number,
  mcMedian?: number
): ChartDataPoint[] {
  const base = generateChartData(projections);
  if (mcP10 == null || mcP90 == null) return base;

  const spreadBase = mcMedian ?? mcP10;
  if (spreadBase <= 0) return base;

  const p10Ratio = mcP10 / spreadBase;
  const p90Ratio = mcP90 / spreadBase;
  return base.map((p) => {
    const pessimistic = Math.round(p.value * p10Ratio);
    const optimistic = Math.round(p.value * p90Ratio);
    return {
      ...p,
      pessimistic,
      optimistic,
      band: optimistic - pessimistic,
    };
  });
}