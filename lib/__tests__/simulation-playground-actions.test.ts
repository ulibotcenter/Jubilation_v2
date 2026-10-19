import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { createModelSeed, emptyHoldings } from "@/lib/onboarding/seed";
import { t } from "@/lib/i18n/messages";
import { mergePersistedAppState, useAppStore } from "@/store/useAppStore";
import { DEFAULT_KPI_VALUES } from "@/types";

describe("simulation playground actions", () => {
  it("labels Zerar and Copiar in PT, EN, and ES", () => {
    expect(t("pt", "simulation.playground.clear")).toBe("Zerar simulação");
    expect(t("en", "simulation.playground.clear")).toBe("Clear simulation");
    expect(t("es", "simulation.playground.clear")).toBe("Poner simulación a cero");
    expect(t("pt", "simulation.playground.copyPortfolio")).toBe(
      "Copiar portfólio atual"
    );
    expect(t("en", "simulation.playground.copyPortfolio")).toBe(
      "Copy current portfolio"
    );
    expect(t("es", "simulation.playground.copyPortfolio")).toBe(
      "Copiar cartera actual"
    );
  });

  it("puts both actions on /simulation, not only in the badge toolbar", () => {
    const page = readFileSync(
      "components/simulation/SimulationPlaygroundPage.tsx",
      "utf8"
    );
    expect(page).toContain('data-sim-action="clear"');
    expect(page).toContain('data-sim-action="copy"');
    expect(page).toContain("playground-actions");
    expect(page).not.toContain("simulation.playground.reset");
    expect(page).not.toContain("handleReset");
  });

  it("does not change the public freedom calculator page", () => {
    const calc = readFileSync(
      "app/calculadoras/quando-fico-livre/page.tsx",
      "utf8"
    );
    expect(calc).not.toContain("data-sim-action");
    expect(calc).not.toContain("clearSimulationPlayground");
  });

  it("zeros the sandbox without wiping the example book or stored holdings", () => {
    const seed = createModelSeed();
    useAppStore.setState({
      portfolio: seed,
      simulationIncludedAssetIds: seed.map((a) => a.id),
      modelSeedActive: true,
      kpis: {
        ...DEFAULT_KPI_VALUES,
        currentNetWorth: 250_000,
        monthlyContribution: 1_200,
      },
    });
    useAppStore.getState().copyPortfolioToSimulation();
    expect(useAppStore.getState().simPlayground.portfolio.length).toBeGreaterThan(
      0
    );

    useAppStore.getState().clearSimulationPlayground();
    const next = useAppStore.getState();
    expect(next.portfolio).toEqual(seed);
    expect(next.modelSeedActive).toBe(true);
    expect(next.simPlayground.portfolio).toEqual([]);
    expect(next.simPlayground.kpis.currentNetWorth).toBe(0);
    expect(next.simPlayground.kpis.monthlyContribution).toBe(0);
    expect(next.simPlayground.kpis.desiredMonthlyIncome).toBe(0);
    expect(next.simPlayground.isActive).toBe(true);
    expect(next.simPlayground.copiedAt).toBeNull();
  });

  it("copies current holdings into the sandbox and invents none when the book is empty", () => {
    const seed = createModelSeed();
    useAppStore.setState({
      portfolio: seed,
      simulationIncludedAssetIds: seed.map((a) => a.id),
      modelSeedActive: true,
    });
    useAppStore.getState().copyPortfolioToSimulation();
    const copied = useAppStore.getState().simPlayground;
    expect(copied.portfolio.map((a) => a.ticker)).toEqual(
      seed.map((a) => a.ticker)
    );
    expect(copied.portfolio.every((a) => a.id.startsWith("sim-"))).toBe(true);
    expect(useAppStore.getState().portfolio).toEqual(seed);

    useAppStore.setState({
      portfolio: emptyHoldings(),
      simulationIncludedAssetIds: [],
      modelSeedActive: false,
      kpis: { ...DEFAULT_KPI_VALUES, currentNetWorth: 0 },
      kpiOutsidePortfolio: 0,
    });
    useAppStore.getState().copyPortfolioToSimulation();
    const emptyCopy = useAppStore.getState().simPlayground;
    expect(emptyCopy.portfolio).toEqual([]);
    expect(emptyCopy.portfolio.length).toBe(0);
    expect(useAppStore.getState().portfolio).toEqual([]);
  });

  it("keeps an empty active sandbox after persist merge", () => {
    const seed = createModelSeed();
    const current = useAppStore.getState();
    const merged = mergePersistedAppState(
      {
        portfolio: seed,
        modelSeedActive: true,
        simulationIncludedAssetIds: seed.map((a) => a.id),
        simPlayground: {
          isActive: true,
          copiedAt: null,
          portfolio: [],
          kpis: { ...DEFAULT_KPI_VALUES, currentNetWorth: 0 },
          kpiOutsidePortfolio: 0,
          simulationIncludedAssetIds: [],
        },
      },
      current
    );
    expect(merged.portfolio.map((a) => a.id)).toEqual(seed.map((a) => a.id));
    expect(merged.simPlayground.isActive).toBe(true);
    expect(merged.simPlayground.portfolio).toEqual([]);
    expect(merged.simPlayground.kpis.currentNetWorth).toBe(0);
  });
});
