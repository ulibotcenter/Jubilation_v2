import { describe, expect, it } from "vitest";
import { buildEnginePlan } from "@/lib/engine/adapter";
import { projectPlan } from "@/lib/engine/project";
import { estimateRetirementTax } from "@/lib/tax/estimates";
import {
  isCoveredTaxHome,
  parseManualTaxRatePct,
  resolveManualTaxRatePct,
  showsManualTaxRate,
} from "@/lib/tax/manual";
import { normalizeKpiValues, type Country } from "@/types";

const QUOTE = {
  currency: "USD" as const,
  rates: { USD: 1, BRL: 5.45, EUR: 0.92 },
};

const retiredKpis = normalizeKpiValues({
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

describe("manual effective tax rate — coverage", () => {
  it("shows the field only outside Brazil", () => {
    expect(isCoveredTaxHome("BR")).toBe(true);
    expect(showsManualTaxRate("BR")).toBe(false);
    for (const country of ["PT", "US", "DE", "ES", "FR"] as Country[]) {
      expect(isCoveredTaxHome(country)).toBe(false);
      expect(showsManualTaxRate(country)).toBe(true);
    }
  });

  it("parses empty as null and never invents a rate", () => {
    expect(parseManualTaxRatePct("")).toBeNull();
    expect(parseManualTaxRatePct(null)).toBeNull();
    expect(parseManualTaxRatePct(undefined)).toBeNull();
    expect(parseManualTaxRatePct("abc")).toBeNull();
    expect(parseManualTaxRatePct(22)).toBe(22);
    expect(parseManualTaxRatePct("22,5")).toBe(22.5);
    expect(resolveManualTaxRatePct("PT", null)).toBe(0);
    expect(resolveManualTaxRatePct("US", undefined)).toBe(0);
    expect(resolveManualTaxRatePct("DE", 28)).toBe(28);
    expect(resolveManualTaxRatePct("BR", 40)).toBe(0);
  });
});

describe("manual effective tax rate — preview", () => {
  const kpis = normalizeKpiValues({
    currentAge: 65,
    retirementAge: 65,
    desiredMonthlyIncome: 10_000,
  });

  it("BR keeps IRPF and ignores a typed 40%", () => {
    const irpf = estimateRetirementTax("BR", kpis, 120_000);
    const ignored = estimateRetirementTax("BR", kpis, 120_000, {
      displayCurrency: "BRL",
      manualEffectiveTaxRatePct: 40,
    });
    expect(ignored.estimatedAnnualTax).toBe(irpf.estimatedAnnualTax);
    expect(ignored.effectiveRatePct).toBe(irpf.effectiveRatePct);
    expect(ignored.effectiveRatePct).not.toBe(40);
    expect(ignored.notes).toMatch(/IRPF|progressiva/i);
  });

  it("PT / US / DE use the typed rate", () => {
    for (const country of ["PT", "US", "DE"] as Country[]) {
      const est = estimateRetirementTax(country, kpis, 100_000, {
        displayCurrency: "USD",
        rates: QUOTE.rates,
        manualEffectiveTaxRatePct: 22,
      });
      expect(est.effectiveRatePct).toBe(22);
      expect(est.estimatedAnnualTax).toBeGreaterThan(0);
      expect(est.notes.toLowerCase()).toMatch(/simplif|empty|vazio|0%/);
    }
  });

  it("empty uncovered rate is 0 — not 28% and not US brackets", () => {
    const empty = estimateRetirementTax("PT", kpis, 100_000, {
      displayCurrency: "EUR",
      manualEffectiveTaxRatePct: null,
    });
    const omitted = estimateRetirementTax("US", kpis, 100_000, {
      displayCurrency: "USD",
    });
    expect(empty.effectiveRatePct).toBe(0);
    expect(empty.estimatedAnnualTax).toBe(0);
    expect(omitted.effectiveRatePct).toBe(0);
    expect(omitted.estimatedAnnualTax).toBe(0);
    expect(empty.effectiveRatePct).not.toBe(28);
  });
});

describe("manual effective tax rate — engine", () => {
  it("US / PT / DE deduct the typed flat rate", () => {
    const live = buildEnginePlan({
      kpis: retiredKpis,
      portfolio: [],
      includedAssetIds: [],
      outsidePortfolio: 2_000_000,
      quote: QUOTE,
      applyTaxes: false,
      manualEffectiveTaxRate: 0.22,
    });
    expect(live.applyTaxes).toBe(false);
    expect(live.manualEffectiveTaxRate).toBe(0.22);
    const year = projectPlan(live).years.find((y) => y.age === 65)!;
    expect(year.taxes).toBe(26_400);
  });

  it("empty uncovered rate deducts nothing", () => {
    const live = buildEnginePlan({
      kpis: retiredKpis,
      portfolio: [],
      includedAssetIds: [],
      outsidePortfolio: 2_000_000,
      quote: QUOTE,
      applyTaxes: false,
      manualEffectiveTaxRate: 0,
    });
    const year = projectPlan(live).years.find((y) => y.age === 65)!;
    expect(year.taxes).toBe(0);
  });

  it("BR IRPF ignores a stored 22% flat rate", () => {
    const monthlyTaxCents = Math.round(748_882 * 0.275 - 90_873);
    expect(monthlyTaxCents).toBe(115_070);

    const live = buildEnginePlan({
      kpis: retiredKpis,
      portfolio: [],
      includedAssetIds: [],
      outsidePortfolio: 2_000_000,
      quote: { currency: "BRL", rates: QUOTE.rates },
      applyTaxes: true,
      manualEffectiveTaxRate: 0.22,
    });
    expect(live.applyTaxes).toBe(true);
    expect(live.manualEffectiveTaxRate).toBe(0);
    const year = projectPlan(live).years.find((y) => y.age === 65)!;
    expect(year.taxes).toBe(Math.round((monthlyTaxCents * 12) / 100));
    expect(year.taxes).not.toBe(26_400);
  });
});
