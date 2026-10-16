import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { CALCULATOR_PATHS } from "@/lib/calculators/seo";
import { navIdFromPathname } from "@/lib/appNavigation";
import {
  LANDING_HORIZON_AGE,
  LANDING_SAMPLE_INPUT,
  LANDING_SAMPLE_SERIES,
  LANDING_WEALTH_AT_HORIZON,
  landingCalculatorHref,
} from "@/lib/landing/sampleProjection";
import { DASHBOARD_PATH, DASHBOARD_PORTFOLIO_PATH, PLANS_PATH } from "@/lib/routes";
import { NAV_ITEMS } from "@/types";

describe("landing at /", () => {
  it("keeps the product home at /painel so / can be the marketing page", () => {
    expect(DASHBOARD_PATH).toBe("/painel");
    expect(NAV_ITEMS.find((item) => item.id === "dashboard")?.href).toBe(
      DASHBOARD_PATH
    );
    expect(NAV_ITEMS.find((item) => item.id === "portfolio")?.href).toBe(
      DASHBOARD_PORTFOLIO_PATH
    );
    expect(navIdFromPathname("/painel")).toBe("dashboard");
    expect(navIdFromPathname("/simulation")).toBe("simulation");
    expect(navIdFromPathname("/settings")).toBe("settings");
  });

  it("renders Simule sua liberdade with CTAs to the existing calculator and /planos", () => {
    const page = readFileSync("app/page.tsx", "utf8");
    const view = readFileSync("components/landing/LandingView.tsx", "utf8");
    expect(page).toContain("Simule sua liberdade");
    expect(view).toContain("landing.cta.personalize");
    expect(view).toContain("landing.cta.plans");
    expect(view).toContain("data-landing-cta=\"personalizar\"");
    expect(view).toContain("data-landing-cta=\"planos\"");
    expect(view).toContain("data-landing-nav=\"painel\"");
    expect(view).toContain("LocaleCurrencyControls");
    expect(page).not.toContain("AppShell");
    expect(view).not.toMatch(/fim de vida|end of life|falecimento|morte/i);
    expect(landingCalculatorHref()).toContain(CALCULATOR_PATHS.freedomDate);
    expect(PLANS_PATH).toBe("/planos");
  });

  it("projects sample wealth to a large number by age 60 using the app engine", () => {
    expect(LANDING_SAMPLE_INPUT.retirementAge).toBe(60);
    expect(LANDING_SAMPLE_SERIES[0]?.age).toBe(LANDING_SAMPLE_INPUT.currentAge);
    expect(LANDING_SAMPLE_SERIES.at(-1)?.age).toBe(LANDING_HORIZON_AGE);
    expect(LANDING_WEALTH_AT_HORIZON).toBeGreaterThan(1_000_000);
    const ages = LANDING_SAMPLE_SERIES.map((point) => point.age);
    expect(ages).toEqual([...ages].sort((a, b) => a - b));
    for (let i = 1; i < LANDING_SAMPLE_SERIES.length; i++) {
      expect(LANDING_SAMPLE_SERIES[i].wealth).toBeGreaterThan(
        LANDING_SAMPLE_SERIES[i - 1].wealth
      );
    }
  });

  it("moves the dashboard to /painel without dropping AppShell", () => {
    const painel = readFileSync("app/painel/page.tsx", "utf8");
    expect(painel).toContain("AppShell");
    expect(painel).toContain("PlannerGate");
    expect(painel).toContain('id="portfolio"');
    const portfolio = readFileSync("app/portfolio/page.tsx", "utf8");
    expect(portfolio).toContain("DASHBOARD_PORTFOLIO_PATH");
  });
});
