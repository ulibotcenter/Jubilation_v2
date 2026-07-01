import type { KPIValues } from "@/types";

export function buildShareText(input: {
  kpis: KPIValues;
  projected: number;
  score: number;
  currency: string;
  branded?: boolean;
}): string {
  const { kpis, projected, score, currency, branded } = input;
  const years = kpis.retirementAge - kpis.currentAge;
  const header = branded
    ? "🌅 Jubilation Horizon — my retirement snapshot\n"
    : "📊 My retirement plan snapshot (Jubilation)\n";
  return (
    header +
    `Age ${kpis.currentAge} → retire at ${kpis.retirementAge} (${years}y)\n` +
    `Net worth today: ${currency}${kpis.currentNetWorth.toLocaleString()}\n` +
    `Projected at retirement: ${currency}${projected.toLocaleString()}\n` +
    `Readiness score: ${score}/100\n` +
    `Goal income: ${currency}${kpis.desiredMonthlyIncome.toLocaleString()}/mo\n` +
    `\nPlan yours → jubilation-v2.vercel.app`
  );
}