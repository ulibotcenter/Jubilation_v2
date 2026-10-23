import { describe, expect, it } from "vitest";
import { convertAmount, convertHoldingMajor, convertKpis } from "@/lib/fx/convert";
import { FALLBACK_FX_RATES } from "@/lib/fx/types";
import { estimateRetirementTax } from "@/lib/tax/estimates";
import { engineApplyTaxes, taxRegionForCountry } from "@/lib/onboarding/country";
import { createModelSeed } from "@/lib/onboarding/seed";
import { heroRealTermsCopy } from "@/lib/i18n/heroRealTerms";
import { computeHoldingMetrics } from "@/lib/portfolioMetrics";
import { aggregatePortfolioMajor } from "@/lib/engine/adapter";
import { buildProjectionEngineConfig } from "@/lib/projectionEngine";
import {
  calculatePortfolioValue,
  formatCurrencyValue,
  normalizeKpiValues,
} from "@/types";
import { convertPortfolio } from "@/lib/fx/convert";
import { allocationByClass, currentAllocation } from "@/lib/rebalance";

const RATES = { USD: 1, BRL: 5, EUR: 0.9 };

describe("BRL / USD / EUR display and conversion", () => {
  it("formats each currency with its own symbol — never forces R$", () => {
    expect(formatCurrencyValue(3401, "BRL", false, "pt-BR")).toMatch(/R\$/);
    expect(formatCurrencyValue(3401, "USD", false, "en-US")).toMatch(/\$/);
    expect(formatCurrencyValue(3401, "USD", false, "en-US")).not.toMatch(/R\$/);
    expect(formatCurrencyValue(3401, "EUR", false, "de-DE")).toMatch(/€/);
    expect(formatCurrencyValue(3401, "EUR", false, "de-DE")).not.toMatch(/R\$/);
    expect(formatCurrencyValue(3401, "USD", false, "pt-BR")).not.toMatch(/R\$/);
  });

  it("converts BRL ↔ USD ↔ EUR at explicit rates", () => {
    expect(convertAmount(100, "USD", "BRL", RATES)).toBe(500);
    expect(convertAmount(500, "BRL", "USD", RATES)).toBe(100);
    expect(convertAmount(100, "USD", "EUR", RATES)).toBe(90);
    expect(convertAmount(90, "EUR", "USD", RATES)).toBe(100);
    expect(convertAmount(500, "BRL", "EUR", RATES)).toBe(90);
    expect(convertAmount(90, "EUR", "BRL", RATES)).toBe(500);
  });

  it("keeps native holdings untouched when the display currency changes", () => {
    const seed = createModelSeed();
    const rewritten = convertPortfolio(seed, "EUR", RATES);
    expect(rewritten.map((a) => a.nativeCurrency ?? a.currency)).toEqual(
      seed.map((a) => a.nativeCurrency ?? a.currency)
    );
    expect(rewritten.find((a) => a.id === "seed-aapl")?.currency).toBe("USD");
    expect(rewritten.find((a) => a.id === "seed-petr")?.currency).toBe("BRL");
  });

  it("aggregates the mixed model seed with FX, not 1:1", () => {
    const seed = createModelSeed();
    const quote = { currency: "BRL" as const, rates: RATES };
    const brl = aggregatePortfolioMajor(seed, quote);
    const usd = aggregatePortfolioMajor(seed, { currency: "USD", rates: RATES });
    expect(brl).toBeCloseTo(usd * 5, 0);
    expect(calculatePortfolioValue(seed, quote)).toBeCloseTo(brl, 0);
    const aaplUsd = 40 * 198.75;
    expect(convertHoldingMajor(aaplUsd, "USD", quote)).toBe(aaplUsd * 5);
  });

  it("converts KPI money fields when the display currency changes", () => {
    const kpis = normalizeKpiValues({
      currentNetWorth: 10_000,
      monthlyContribution: 1_000,
      monthlyExpenses: 2_000,
      desiredMonthlyIncome: 2_000,
    });
    const usd = convertKpis(kpis, "BRL", "USD", RATES);
    expect(usd.currentNetWorth).toBe(2_000);
    expect(usd.monthlyContribution).toBe(200);
  });

  it("applies Brazilian IRPF in BRL then converts the tax to the display currency", () => {
    const kpis = normalizeKpiValues({
      currentAge: 65,
      retirementAge: 65,
      desiredMonthlyIncome: 2_000,
    });
    const brl = estimateRetirementTax("BR", kpis, 24_000, {
      displayCurrency: "BRL",
      rates: RATES,
    });
    const usd = estimateRetirementTax("BR", kpis, 4_800, {
      displayCurrency: "USD",
      rates: RATES,
    });
    expect(usd.estimatedAnnualTax).toBeCloseTo(brl.estimatedAnnualTax / 5, 0);
    expect(taxRegionForCountry("US")).toBe("usa");
    expect(engineApplyTaxes("US")).toBe(false);
    expect(engineApplyTaxes("BR")).toBe(true);
  });

  it("does not apply Brazilian IRPF in the engine when the tax home is the US", () => {
    const kpis = normalizeKpiValues({ currentNetWorth: 100_000 });
    const us = buildProjectionEngineConfig(kpis, [], [], 100_000, {
      currency: "USD",
      rates: RATES,
    }, { applyTaxes: engineApplyTaxes("US") });
    const br = buildProjectionEngineConfig(kpis, [], [], 100_000, {
      currency: "BRL",
      rates: RATES,
    }, { applyTaxes: engineApplyTaxes("BR") });
    expect(us.plan.applyTaxes).toBe(false);
    expect(us.plan.currency).toBe("USD");
    expect(br.plan.applyTaxes).toBe(true);
    expect(br.plan.currency).toBe("BRL");
  });

  it("PT hero copy follows the display currency — never hardcodes reais under EUR/USD", () => {
    expect(heroRealTermsCopy("pt", "EUR")).toMatch(/euros/i);
    expect(heroRealTermsCopy("pt", "EUR")).not.toMatch(/reais/i);
    expect(heroRealTermsCopy("pt", "USD")).toMatch(/dólares/i);
    expect(heroRealTermsCopy("pt", "USD")).not.toMatch(/reais/i);
    expect(heroRealTermsCopy("pt", "BRL")).toMatch(/reais/i);
    expect(heroRealTermsCopy("en", "EUR")).not.toMatch(/reais/i);
  });

  it("table weight uses display-currency market value, not native ÷ FX total", () => {
    const seed = createModelSeed();
    const quote = { currency: "USD" as const, rates: FALLBACK_FX_RATES };
    const total = calculatePortfolioValue(seed, quote);
    const rows = seed.map((asset) => computeHoldingMetrics(asset, total, quote));
    const home = rows[seed.findIndex((a) => a.id === "seed-home")];
    const nativeHome = 850_000;
    expect(home.marketValue).toBeCloseTo(nativeHome / 5.45, 0);
    expect(home.weightPct).toBeGreaterThan(50);
    expect(home.weightPct).toBeLessThan(60);
    expect(home.weightPct).not.toBeCloseTo((nativeHome / total) * 100, 0);
    const weightSum = rows.reduce((s, r) => s + r.weightPct, 0);
    expect(weightSum).toBeCloseTo(100, 0);

    const eurQuote = { currency: "EUR" as const, rates: FALLBACK_FX_RATES };
    const eurTotal = calculatePortfolioValue(seed, eurQuote);
    const eurHome = computeHoldingMetrics(
      seed.find((a) => a.id === "seed-home")!,
      eurTotal,
      eurQuote
    );
    expect(eurHome.weightPct).toBeGreaterThan(50);
    expect(eurHome.weightPct).toBeLessThan(60);
  });

  it("class allocation uses display-currency values — no class over 100% on mixed seed", () => {
    const seed = createModelSeed();
    const nativeHome = 850_000;

    for (const currency of ["USD", "EUR", "BRL"] as const) {
      const quote = { currency, rates: FALLBACK_FX_RATES };
      const total = calculatePortfolioValue(seed, quote);
      const slices = currentAllocation(seed, quote);
      const segments = allocationByClass(seed, quote);
      const realEstate = slices.find((s) => s.assetClass === "real_estate");
      const homeRow = computeHoldingMetrics(
        seed.find((a) => a.id === "seed-home")!,
        total,
        quote
      );

      expect(realEstate).toBeDefined();
      expect(realEstate!.currentPct).toBeGreaterThan(50);
      expect(realEstate!.currentPct).toBeLessThan(60);
      expect(realEstate!.currentPct).toBeCloseTo(
        Math.round(homeRow.weightPct * 10) / 10,
        1
      );
      if (currency !== "BRL") {
        expect(realEstate!.currentPct).not.toBeCloseTo(
          (nativeHome / total) * 100,
          0
        );
      }

      for (const slice of slices) {
        expect(slice.currentPct).toBeGreaterThan(0);
        expect(slice.currentPct).toBeLessThanOrEqual(100);
      }
      const sliceSum = slices.reduce((sum, s) => sum + s.currentPct, 0);
      expect(sliceSum).toBeCloseTo(100, 0);

      for (const seg of segments) {
        expect(seg.pct).toBeGreaterThan(0);
        expect(seg.pct).toBeLessThanOrEqual(100);
      }
      const segSum = segments.reduce((sum, s) => sum + s.pct, 0);
      expect(segSum).toBeCloseTo(100, 0);
    }
  });
});
