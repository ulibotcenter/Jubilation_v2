/** True when the planner already has a book or money inputs worth showing. */
export function hasDashboardData(input: {
  portfolioCount: number;
  currentNetWorth: number;
  monthlyContribution: number;
  monthlyExpenses: number;
  desiredMonthlyIncome: number;
}): boolean {
  return (
    input.portfolioCount > 0 ||
    input.currentNetWorth > 0 ||
    input.monthlyContribution > 0 ||
    input.monthlyExpenses > 0 ||
    input.desiredMonthlyIncome > 0
  );
}
