import { describe, expect, it } from "vitest";
import {
  calculateMonthlyIrpf,
  fgtsBirthdayWithdrawalCents,
  previdenciaRegressiveRate,
  regressiveFixedIncomeRate,
} from "@/lib/engine/tax";
import { estimateRetirementTax } from "@/lib/tax/estimates";
import { normalizeKpiValues } from "@/types";
import { buildEnginePlan } from "@/lib/engine/adapter";
import { projectPlan } from "@/lib/engine/project";

describe("M9 — IRPF progressive, no 400k cliff", () => {
  const kpis = normalizeKpiValues({
    currentAge: 65,
    retirementAge: 65,
    desiredMonthlyIncome: 10_000,
  });

  it("R$ 5.000/mês zera com a redução de 2026", () => {
    const r = calculateMonthlyIrpf({
      monthlyIncomeCents: 500_000,
      age: 40,
      retirementIncome: false,
    });
    expect(r.taxCents).toBe(0);
  });

  it("R$ 8.000/mês = R$ 1.124,29 (tabela + desconto simplificado)", () => {
    const r = calculateMonthlyIrpf({
      monthlyIncomeCents: 800_000,
      age: 40,
      retirementIncome: false,
    });
    expect(r.taxCents).toBe(112_429);
  });

  it("R$ 2 of extra annual income cannot cost R$ 50.000 of tax", () => {
    const a = estimateRetirementTax("BR", kpis, 399_999);
    const b = estimateRetirementTax("BR", kpis, 400_001);
    expect(Math.abs(b.estimatedAnnualTax - a.estimatedAnnualTax)).toBeLessThan(100);
    expect(a.estimatedAnnualTax).not.toBe(60_000);
    expect(b.estimatedAnnualTax).not.toBe(110_000);
  });

  it("applies the R$ 1.903,98 exemption at 65", () => {
    const withExemption = calculateMonthlyIrpf({
      monthlyIncomeCents: 500_000,
      age: 65,
      retirementIncome: true,
    });
    const without = calculateMonthlyIrpf({
      monthlyIncomeCents: 500_000,
      age: 40,
      retirementIncome: true,
    });
    expect(withExemption.exemptionCents).toBe(190_398);
    expect(withExemption.taxCents).toBeLessThanOrEqual(without.taxCents);
  });
});

describe("parameterized Brazilian rules", () => {
  it("counts PGBL/VGBL lots from the contribution date, not plan start", () => {
    expect(previdenciaRegressiveRate(1)).toBe(0.35);
    expect(previdenciaRegressiveRate(11)).toBe(0.1);
  });

  it("uses the fixed-income regressive table", () => {
    expect(regressiveFixedIncomeRate(100)).toBe(0.225);
    expect(regressiveFixedIncomeRate(800)).toBe(0.15);
  });

  it("applies saque-aniversário on the whole balance, not progressive slices", () => {
    // R$ 1.500,01 → 30% + R$ 150 = 600.003, not 50%+40%+30% slices
    const cents = fgtsBirthdayWithdrawalCents(150_001);
    expect(cents).toBe(Math.round(150_001 * 0.3 + 15_000));
  });
});

describe("live path deducts IRPF (not a decorative preview)", () => {
  it("R$ 10.000/mês at 65 costs R$ 1.150,70/mês — net liquid is lower than gross", () => {
    // RFB 2026 monthly table, retirement income at 65:
    // exemption R$ 1.903,98 → remaining 8.096,02
    // simplified R$ 607,20 → base 7.488,82
    // 27.5% − R$ 908,73 = R$ 1.150,6955 → 115.070 cents
    const monthlyTaxCents = Math.round(748_882 * 0.275 - 90_873);
    expect(monthlyTaxCents).toBe(115_070);

    const kpis = normalizeKpiValues({
      currentAge: 64,
      retirementAge: 65,
      lifeExpectancy: 65,
      currentNetWorth: 2_000_000,
      monthlyContribution: 0,
      monthlyExpenses: 0,
      desiredMonthlyIncome: 10_000,
      expectedCAGR: 0,
      annualInflation: 0,
    });
    const quote = {
      currency: "BRL" as const,
      rates: { USD: 1, BRL: 5.45, EUR: 0.92 },
    };
    const live = buildEnginePlan({
      kpis,
      portfolio: [],
      includedAssetIds: [],
      outsidePortfolio: 2_000_000,
      quote,
    });
    expect(live.applyTaxes).toBe(true);

    const gross = buildEnginePlan({
      kpis,
      portfolio: [],
      includedAssetIds: [],
      outsidePortfolio: 2_000_000,
      quote,
      applyTaxes: false,
    });

    const taxedYear = projectPlan(live).years.find((y) => y.age === 65)!;
    const grossYear = projectPlan(gross).years.find((y) => y.age === 65)!;
    expect(grossYear.taxes).toBe(0);
    expect(taxedYear.taxes).toBe(Math.round((monthlyTaxCents * 12) / 100));
    expect(taxedYear.liquidValue).toBeLessThan(grossYear.liquidValue);
    expect(grossYear.liquidValue - taxedYear.liquidValue).toBe(taxedYear.taxes);
  });
});
