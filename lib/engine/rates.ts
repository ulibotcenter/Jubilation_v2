/** Fisher equation: real = (1+nominal)/(1+inflation) − 1 */
export function fisherReal(nominal: number, inflation: number): number {
  return (1 + nominal) / (1 + inflation) - 1;
}

export function fisherNominal(real: number, inflation: number): number {
  return (1 + real) * (1 + inflation) - 1;
}

export function annualToMonthly(annual: number): number {
  return Math.pow(1 + annual, 1 / 12) - 1;
}

export function monthlyToAnnual(monthly: number): number {
  return Math.pow(1 + monthly, 12) - 1;
}

export function inflationFactor(annualInflation: number, years: number): number {
  return Math.pow(1 + annualInflation, years);
}
