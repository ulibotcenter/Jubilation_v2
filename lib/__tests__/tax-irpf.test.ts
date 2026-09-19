import { describe, expect, it } from "vitest";
import {
  calculateMonthlyIrpf,
  fgtsBirthdayWithdrawalCents,
  previdenciaRegressiveRate,
  regressiveFixedIncomeRate,
} from "@/lib/engine/tax";
import { estimateRetirementTax } from "@/lib/tax/estimates";
import { normalizeKpiValues } from "@/types";

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
    const a = estimateRetirementTax("br", kpis, 399_999);
    const b = estimateRetirementTax("br", kpis, 400_001);
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
