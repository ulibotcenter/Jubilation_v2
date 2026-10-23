import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { hasDashboardData } from "@/lib/dashboard/hasDashboardData";
import { t } from "@/lib/i18n/messages";
import { DASHBOARD_PORTFOLIO_PATH } from "@/lib/routes";

describe("dashboard has data", () => {
  const empty = {
    portfolioCount: 0,
    currentNetWorth: 0,
    monthlyContribution: 0,
    monthlyExpenses: 0,
    desiredMonthlyIncome: 0,
  };

  it("keeps a seed or real book on the filled dashboard", () => {
    expect(hasDashboardData({ ...empty, portfolioCount: 6 })).toBe(true);
  });

  it("keeps a plan that already has money inputs", () => {
    expect(hasDashboardData({ ...empty, monthlyContribution: 800 })).toBe(true);
    expect(hasDashboardData({ ...empty, currentNetWorth: 1 })).toBe(true);
    expect(hasDashboardData({ ...empty, monthlyExpenses: 1 })).toBe(true);
    expect(hasDashboardData({ ...empty, desiredMonthlyIncome: 1 })).toBe(true);
  });

  it("is empty only when the book and the money inputs are zero", () => {
    expect(hasDashboardData(empty)).toBe(false);
  });
});

describe("empty state copy", () => {
  it("uses a short Portuguese welcome and the freedom calculator label", () => {
    expect(t("pt", "empty.painel.title")).toBe("Seu painel começa aqui");
    expect(t("pt", "empty.painel.body")).toBe(
      "Ainda não há um plano salvo. A calculadora mostra quando você fica livre."
    );
    expect(t("pt", "empty.painel.cta")).toBe("Simule sua liberdade");
    expect(t("pt", "empty.portfolio.title")).toBe(
      "Seus investimentos aparecem aqui"
    );
    expect(t("pt", "empty.portfolio.body")).toBe(
      "Você adiciona investimentos no Básico ou acima."
    );
    expect(t("pt", "empty.painel.body").toLowerCase()).not.toMatch(
      /erro|falha|não fecha/
    );
    expect(t("pt", "empty.portfolio.body").toLowerCase()).not.toMatch(
      /erro|falha/
    );
  });
});

describe("empty state routes", () => {
  it("keeps the filled painel and points empty CTAs at the real pages", () => {
    const painel = readFileSync("app/painel/page.tsx", "utf8");
    const screens = readFileSync("components/dashboard/EmptyScreens.tsx", "utf8");
    const portfolioPage = readFileSync("app/portfolio/page.tsx", "utf8");
    const realPortfolio = readFileSync(
      "components/dashboard/RealPortfolio.tsx",
      "utf8"
    );

    expect(painel).toContain("PlannerGate");
    expect(painel).toContain("RetirementHero");
    expect(painel).toContain("ProjectionChartCard");
    expect(painel).toContain("<RealPortfolio />");
    expect(painel).toContain("hasDashboardData");
    expect(screens).toContain("CALCULATOR_PATHS.freedomDate");
    expect(screens).toContain("PLANS_PATH");
    expect(screens).toContain('data-empty="painel"');
    expect(screens).toContain('data-empty="portfolio"');
    expect(screens).not.toContain("PortfolioHoldingsTable");
    expect(screens).not.toContain("PortfolioAllocationChart");
    expect(realPortfolio).toContain("PortfolioEmptyState");
    expect(realPortfolio).toContain('data-portfolio-toolbar="list"');
    expect(realPortfolio).toContain('align="toolbar"');
    const statsAt = realPortfolio.indexOf('className="portfolio-stat-grid"');
    const toolbarAfterStats = realPortfolio.indexOf("{actionToolbar}", statsAt);
    const chipsAt = realPortfolio.indexOf("portfolio-class-chips");
    expect(statsAt).toBeGreaterThan(-1);
    expect(toolbarAfterStats).toBeGreaterThan(statsAt);
    expect(chipsAt).toBeGreaterThan(toolbarAfterStats);
    expect(portfolioPage).toContain("DASHBOARD_PORTFOLIO_PATH");
    expect(DASHBOARD_PORTFOLIO_PATH).toBe("/painel#portfolio");
  });
});
