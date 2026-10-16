import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  convertChartSeries,
  independenceChartSeries,
} from "@/lib/calculators/chartSeries";
import { FREEDOM_DEFAULTS } from "@/lib/calculators/independence";
import { t } from "@/lib/i18n/messages";
import { LANDING_SAMPLE_INPUT } from "@/lib/landing/sampleProjection";
import { partializePersistedState } from "@/lib/persist/partialize";
import { LOCAL_STORAGE_KEY } from "@/types";
import { FALLBACK_FX_RATES } from "@/lib/fx/types";

describe("lote 2 locale + calculator chart", () => {
  it("grows a projection from zero wealth using the public engine", () => {
    const series = independenceChartSeries({
      ...LANDING_SAMPLE_INPUT,
      liquidWealth: 0,
    });
    expect(series[0]?.wealth).toBe(0);
    expect(series.length).toBeGreaterThan(2);
    for (let i = 1; i < series.length; i++) {
      expect(series[i].wealth).toBeGreaterThan(series[i - 1].wealth);
    }
  });

  it("still draws a series when wealth and contribution are both zero", () => {
    const series = independenceChartSeries({
      ...FREEDOM_DEFAULTS,
      liquidWealth: 0,
      monthlyContribution: 0,
    });
    expect(series.length).toBeGreaterThan(1);
    expect(series.every((point) => point.wealth === 0)).toBe(true);
  });

  it("converts the landing sample display without changing the engine units", () => {
    const brl = independenceChartSeries(LANDING_SAMPLE_INPUT, 60);
    const usd = convertChartSeries(brl, "BRL", "USD", FALLBACK_FX_RATES);
    expect(usd).toHaveLength(brl.length);
    expect(usd.at(-1)!.wealth).toBeCloseTo(
      brl.at(-1)!.wealth / FALLBACK_FX_RATES.BRL,
      0
    );
  });

  it("keeps locale and currency in the existing persist slice", () => {
    const persisted = partializePersistedState({
      locale: "en",
      currency: "USD",
      country: "US",
      manualEffectiveTaxRatePct: null,
      modelSeedActive: false,
      fxSnapshot: null,
      onboarding: { completed: false },
      sidebarCollapsed: false,
      persistVersion: 1,
      tenant: { dataRegion: "eu" },
      institutions: [],
      accounts: [],
      cashFlows: [],
      entitlements: [],
      consents: [],
      consentAuditLog: [],
      connectorSync: {},
      household: {},
      user: {},
      explainSimple: false,
      theme: "light",
      coachMarksDismissed: false,
      sensitivity: { cagr: null, inflation: null },
      netWorthSnapshots: [],
      aiChatHistory: [],
      savedScenarios: [],
      kpis: {},
      kpiOutsidePortfolio: 0,
      portfolio: [],
      portfolioLastRefreshedAt: null,
      simulationIncludedAssetIds: [],
      monteCarlo: {},
      simPlayground: {},
    });
    expect(persisted.locale).toBe("en");
    expect(persisted.currency).toBe("USD");
    expect(LOCAL_STORAGE_KEY).toBe("jubilation-v2-state");
  });

  it("does not force html lang to pt-BR in public calculator chrome", () => {
    const chrome = readFileSync("components/calculators/PublicChrome.tsx", "utf8");
    expect(chrome).not.toContain("document.documentElement.lang='pt-BR'");
    expect(chrome).toContain("LocaleCurrencyControls");
    const controls = readFileSync(
      "components/platform/LocaleCurrencyControls.tsx",
      "utf8"
    );
    expect(controls).toContain("setLocale");
    expect(controls).toContain("changeCurrency");
    expect(controls).toContain("setCurrency");
    expect(controls).toContain("data-locale");
    expect(controls).toContain("data-currency");
  });

  it("shows the freedom calculator chart from the live client island", () => {
    const page = readFileSync("app/calculadoras/quando-fico-livre/page.tsx", "utf8");
    const calc = readFileSync("components/calculators/FreedomCalculator.tsx", "utf8");
    expect(page).toContain("FreedomCalculator");
    expect(calc).toContain("freedomChartSeries");
    expect(calc).toContain("ProjectionChart");
  });

  it("translates the landing headline in pt, en, and es", () => {
    expect(t("pt", "landing.headline")).toBe("Simule sua liberdade");
    expect(t("en", "landing.headline")).toBe("Simulate your freedom");
    expect(t("es", "landing.headline")).toBe("Simula tu libertad");
    expect(t("pt", "landing.cta.personalize")).toBe("Personalizar o meu");
  });
});
