"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { normalizeB3Ticker } from "@/lib/market/b3";
import type { QuoteResult } from "@/lib/market/types";
import { convertAmount, convertKpis, convertPortfolio } from "@/lib/fx/convert";
import { fetchFxRates } from "@/lib/fx/client";
import type { FxSnapshot } from "@/lib/fx/types";
import { fetchPortfolioQuotes } from "@/lib/marketClient";
import { isNonMarketAsset } from "@/lib/physicalAssetPresets";
import {
  deriveOutsideFromManualNetWorth,
  syncNetWorthWithPortfolio,
} from "@/lib/netWorthSync";
import type { CoachMessage } from "@/lib/ai/retirementCoach";
import type { AppLocale } from "@/lib/i18n/messages";
import type { PlanTier } from "@/lib/plans";
import {
  chartDataWithMcBands,
  generateExtendedProjections,
} from "@/lib/projectionsExtended";
import {
  buildPlaygroundProjections,
  initialPlaygroundFromMock,
  normalizeSimPlayground,
  snapshotFromRealState,
  type SimulationPlaygroundState,
} from "@/lib/simulationPlayground";
import {
  getDefaultIncludedAssetIds,
  resolveSimulationKpis,
} from "@/lib/simulationScope";
import {
  DEFAULT_KPI_VALUES,
  DEFAULT_LOCALE,
  DEFAULT_USER,
  LOCAL_STORAGE_KEY,
  type AssetClass,
  type Currency,
  type DashboardTab,
  type DistributionBin,
  type KPIField,
  type KPIValues,
  type MonteCarloResult,
  type MonteCarloScenario,
  type NavItemId,
  type OnboardingStep,
  type PortfolioAsset,
  type StressTestId,
  calculatePortfolioValue,
  generateChartData,
  generateProjections,
  MOCK_PORTFOLIO,
  normalizeKpiValues,
  runMonteCarloSimulation,
  runStressTest,
} from "@/types";

/** Bump when default demo portfolio / KPIs change — migrates persisted local data */
const DEMO_SEED_VERSION = 3;

export interface NetWorthSnapshot {
  id: string;
  capturedAt: string;
  value: number;
}

export interface SavedScenario {
  id: string;
  name: string;
  savedAt: string;
  snapshot: SimulationPlaygroundState;
}

export interface SensitivityState {
  cagr: number | null;
  inflation: number | null;
}

export interface NeedleDelta {
  field: KPIField;
  before: number;
  after: number;
  projectedBefore: number;
  projectedAfter: number;
}

function applySensitivity(
  kpis: KPIValues,
  sensitivity: SensitivityState
): KPIValues {
  return {
    ...kpis,
    expectedCAGR: sensitivity.cagr ?? kpis.expectedCAGR,
    annualInflation: sensitivity.inflation ?? kpis.annualInflation,
  };
}

function buildProjectionsFromState(state: {
  kpis: KPIValues;
  portfolio: PortfolioAsset[];
  simulationIncludedAssetIds: string[];
  kpiOutsidePortfolio: number;
  sensitivity?: SensitivityState;
  monteCarlo?: {
    results: MonteCarloResult[];
  };
}) {
  const syncedKpis = syncNetWorthWithPortfolio(
    normalizeKpiValues(state.kpis),
    state.portfolio,
    state.kpiOutsidePortfolio
  );
  const effectiveKpis = resolveSimulationKpis(
    applySensitivity(syncedKpis, state.sensitivity ?? { cagr: null, inflation: null }),
    state.portfolio,
    state.simulationIncludedAssetIds,
    state.kpiOutsidePortfolio
  );
  const projections = generateExtendedProjections(effectiveKpis);
  const mcBase = state.monteCarlo?.results?.find((r) => r.scenario === "base");
  const chartData = chartDataWithMcBands(
    projections,
    mcBase?.percentile10,
    mcBase?.percentile90
  );
  return {
    kpis: syncedKpis,
    effectiveKpis,
    projections,
    chartData,
  };
}

function pushSimUndo(state: SimulationPlaygroundState, stack: SimulationPlaygroundState[]) {
  return [JSON.parse(JSON.stringify(state)) as SimulationPlaygroundState, ...stack].slice(0, 8);
}

function findQuoteForAsset(
  ticker: string,
  quoteMap: Map<string, QuoteResult>
) {
  const keys = [
    ticker.toUpperCase(),
    normalizeB3Ticker(ticker).toUpperCase(),
  ];
  for (const key of keys) {
    const hit = quoteMap.get(key);
    if (hit) return hit;
  }
  return undefined;
}

function invalidateMonteCarlo(state: AppStore["monteCarlo"]) {
  return {
    ...state,
    hasRun: false,
    results: [],
    distributions: null,
    target: null,
  };
}

export interface AppStore {
  locale: typeof DEFAULT_LOCALE;
  currency: Currency;
  activeNav: NavItemId;
  activeTab: DashboardTab;
  sidebarOpen: boolean;
  sidebarCollapsed: boolean;
  onboarding: {
    completed: boolean;
    currentStep: OnboardingStep;
    disclaimerAccepted: boolean;
  };
  user: typeof DEFAULT_USER;
  kpis: KPIValues;
  kpiOutsidePortfolio: number;
  portfolio: PortfolioAsset[];
  portfolioSearchQuery: string;
  portfolioLastRefreshedAt: string | null;
  isRefreshingPrices: boolean;
  simulationIncludedAssetIds: string[];
  projections: ReturnType<typeof generateProjections>;
  chartData: ReturnType<typeof generateChartData>;
  monteCarlo: {
    hasRun: boolean;
    isRunning: boolean;
    lastRunAt: string | null;
    results: MonteCarloResult[];
    distributions: Record<MonteCarloScenario, DistributionBin[]> | null;
    target: number | null;
    iterations: number;
  };
  activeStressTest: StressTestId | null;
  stressTestResults: ReturnType<typeof runStressTest>[];
  isExporting: boolean;
  projectionRevision: number;
  fxSnapshot: FxSnapshot | null;
  isChangingCurrency: boolean;
  demoSeedVersion: number;
  planTier: PlanTier;
  explainSimple: boolean;
  theme: "dark" | "light";
  presentationMode: boolean;
  coachMarksDismissed: boolean;
  coachOpen: boolean;
  sensitivity: SensitivityState;
  netWorthSnapshots: NetWorthSnapshot[];
  aiChatHistory: CoachMessage[];
  savedScenarios: SavedScenario[];
  simUndoStack: SimulationPlaygroundState[];
  lastNeedleDelta: NeedleDelta | null;
  simPlayground: SimulationPlaygroundState;

  setLocale: (locale: AppLocale) => void;
  setPlanTier: (tier: PlanTier) => void;
  setExplainSimple: (value: boolean) => void;
  setTheme: (theme: "dark" | "light") => void;
  togglePresentationMode: () => void;
  dismissCoachMarks: () => void;
  setCoachOpen: (open: boolean) => void;
  setSensitivity: (patch: { cagr: number; inflation: number }) => void;
  resetSensitivity: () => void;
  addNetWorthSnapshot: (value: number) => void;
  pushAiMessage: (message: CoachMessage) => void;
  clearAiChat: () => void;
  saveNamedScenario: (name: string) => void;
  loadNamedScenario: (id: string) => void;
  undoSimPlayground: () => void;
  setCurrency: (currency: Currency) => void;
  changeCurrency: (currency: Currency) => Promise<FxSnapshot>;
  setOnboardingStep: (step: OnboardingStep) => void;
  setDisclaimerAccepted: (accepted: boolean) => void;
  completeOnboarding: () => void;
  setKPI: (field: KPIField, value: number) => void;
  setActiveTab: (tab: DashboardTab) => void;
  setActiveNav: (nav: NavItemId) => void;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebarCollapsed: () => void;
  setPortfolioSearchQuery: (query: string) => void;
  addPortfolioAsset: (asset: PortfolioAsset) => void;
  updatePortfolioAsset: (
    id: string,
    patch: Partial<
      Pick<
        PortfolioAsset,
        | "quantity"
        | "costBasis"
        | "currentPrice"
        | "name"
        | "assetClass"
        | "priceSource"
        | "lastPriceAt"
        | "previousPrice"
      >
    >
  ) => void;
  removePortfolioAsset: (id: string) => void;
  refreshPortfolioPrices: () => Promise<{ updated: number; skipped: number }>;
  setSimulationIncludedAssetIds: (ids: string[]) => void;
  toggleSimulationAsset: (assetId: string) => void;
  toggleSimulationAssetClass: (assetClass: AssetClass, include: boolean) => void;
  recalculateProjections: () => void;
  runMonteCarlo: () => Promise<void>;
  runStressTestById: (testId: StressTestId) => void;
  setExporting: (exporting: boolean) => void;
  copyPortfolioToSimulation: () => void;
  ensureSimPlayground: () => void;
  setSimKPI: (field: KPIField, value: number) => void;
  setSimPortfolioSearchQuery: (query: string) => void;
  addSimPortfolioAsset: (asset: PortfolioAsset) => void;
  updateSimPortfolioAsset: (
    id: string,
    patch: Partial<
      Pick<
        PortfolioAsset,
        | "quantity"
        | "costBasis"
        | "currentPrice"
        | "name"
        | "assetClass"
        | "priceSource"
        | "lastPriceAt"
        | "previousPrice"
      >
    >
  ) => void;
  removeSimPortfolioAsset: (id: string) => void;
  refreshSimPortfolioPrices: () => Promise<{ updated: number; skipped: number }>;
  setSimSimulationIncludedAssetIds: (ids: string[]) => void;
  toggleSimSimulationAsset: (assetId: string) => void;
  toggleSimSimulationAssetClass: (assetClass: AssetClass, include: boolean) => void;
  runSimMonteCarlo: () => Promise<void>;
  runSimStressTestById: (testId: StressTestId) => void;
}

function invalidateSimMonteCarlo(
  mc: SimulationPlaygroundState["monteCarlo"]
): SimulationPlaygroundState["monteCarlo"] {
  return {
    ...mc,
    hasRun: false,
    results: [],
    distributions: null,
    target: null,
  };
}

function rebuildSimPlayground(
  sim: SimulationPlaygroundState
): SimulationPlaygroundState {
  const built = buildPlaygroundProjections(sim);
  return {
    ...sim,
    kpis: built.kpis,
    projections: built.projections,
    chartData: built.chartData,
    projectionRevision: sim.projectionRevision + 1,
    monteCarlo: invalidateSimMonteCarlo(sim.monteCarlo),
    activeStressTest: null,
    stressTestResults: [],
  };
}

const defaultIncludedIds = getDefaultIncludedAssetIds(MOCK_PORTFOLIO);
const seedPortfolioTotal = calculatePortfolioValue(MOCK_PORTFOLIO);
const seedKpis = normalizeKpiValues({
  currentNetWorth: Math.round(seedPortfolioTotal),
});
const initialOutside = 0;
const initialBuild = buildProjectionsFromState({
  kpis: seedKpis,
  portfolio: MOCK_PORTFOLIO,
  simulationIncludedAssetIds: defaultIncludedIds,
  kpiOutsidePortfolio: initialOutside,
  sensitivity: { cagr: null, inflation: null },
});

export const useAppStore = create<AppStore>()(
  persist(
    (set, get) => ({
      locale: DEFAULT_LOCALE,
      currency: "USD",
      activeNav: "dashboard",
      activeTab: "real-portfolio",
      sidebarOpen: false,
      sidebarCollapsed: false,
      onboarding: {
        completed: false,
        currentStep: 1,
        disclaimerAccepted: false,
      },
      user: DEFAULT_USER,
      kpis: initialBuild.kpis,
      kpiOutsidePortfolio: initialOutside,
      portfolio: MOCK_PORTFOLIO,
      portfolioSearchQuery: "",
      portfolioLastRefreshedAt: null,
      isRefreshingPrices: false,
      simulationIncludedAssetIds: defaultIncludedIds,
      projections: initialBuild.projections,
      chartData: initialBuild.chartData,
      monteCarlo: {
        hasRun: false,
        isRunning: false,
        lastRunAt: null,
        results: [],
        distributions: null,
        target: null,
        iterations: 1000,
      },
      activeStressTest: null,
      stressTestResults: [],
      isExporting: false,
      projectionRevision: 0,
      fxSnapshot: null,
      isChangingCurrency: false,
      demoSeedVersion: DEMO_SEED_VERSION,
      planTier: "free",
      explainSimple: false,
      theme: "dark",
      presentationMode: false,
      coachMarksDismissed: false,
      coachOpen: false,
      sensitivity: { cagr: null, inflation: null },
      netWorthSnapshots: [],
      aiChatHistory: [],
      savedScenarios: [],
      simUndoStack: [],
      lastNeedleDelta: null,
      simPlayground: initialPlaygroundFromMock(
        initialBuild.kpis,
        initialOutside,
        MOCK_PORTFOLIO,
        defaultIncludedIds
      ),

      setLocale: (locale) => {
        set({ locale });
        if (typeof document !== "undefined") {
          document.documentElement.lang = locale;
        }
      },

      setPlanTier: (tier) => set({ planTier: tier }),

      setExplainSimple: (value) => set({ explainSimple: value }),

      setTheme: (theme) => {
        set({ theme });
        if (typeof document !== "undefined") {
          const el = document.documentElement;
          el.classList.remove("dark", "light");
          el.classList.add(theme);
          el.style.colorScheme = theme;
        }
      },

      togglePresentationMode: () =>
        set((s) => ({ presentationMode: !s.presentationMode })),

      dismissCoachMarks: () => set({ coachMarksDismissed: true }),

      setCoachOpen: (open) => set({ coachOpen: open }),

      setSensitivity: (patch) => {
        const state = get();
        const sensitivity = { cagr: patch.cagr, inflation: patch.inflation };
        const built = buildProjectionsFromState({
          ...state,
          sensitivity,
        });
        set({
          sensitivity,
          kpis: built.kpis,
          projections: built.projections,
          chartData: built.chartData,
          projectionRevision: state.projectionRevision + 1,
        });
      },

      resetSensitivity: () => {
        const state = get();
        const built = buildProjectionsFromState({
          ...state,
          sensitivity: { cagr: null, inflation: null },
        });
        set({
          sensitivity: { cagr: null, inflation: null },
          projections: built.projections,
          chartData: built.chartData,
          projectionRevision: state.projectionRevision + 1,
        });
      },

      addNetWorthSnapshot: (value) =>
        set((s) => ({
          netWorthSnapshots: [
            ...s.netWorthSnapshots,
            {
              id: `snap-${Date.now()}`,
              capturedAt: new Date().toISOString(),
              value: Math.round(value),
            },
          ],
        })),

      pushAiMessage: (message) =>
        set((s) => ({
          aiChatHistory: [...s.aiChatHistory, message].slice(-40),
        })),

      clearAiChat: () => set({ aiChatHistory: [] }),

      saveNamedScenario: (name) => {
        const state = get();
        const entry: SavedScenario = {
          id: `sc-${Date.now()}`,
          name,
          savedAt: new Date().toISOString(),
          snapshot: JSON.parse(
            JSON.stringify(state.simPlayground)
          ) as SimulationPlaygroundState,
        };
        set({ savedScenarios: [...state.savedScenarios, entry].slice(-12) });
      },

      loadNamedScenario: (id) => {
        const state = get();
        const found = state.savedScenarios.find((s) => s.id === id);
        if (!found) return;
        set({
          simPlayground: found.snapshot,
          simUndoStack: pushSimUndo(state.simPlayground, state.simUndoStack),
        });
      },

      undoSimPlayground: () => {
        const state = get();
        const [head, ...rest] = state.simUndoStack;
        if (!head) return;
        set({ simPlayground: head, simUndoStack: rest });
      },

      setCurrency: (currency) => set({ currency }),

      changeCurrency: async (next) => {
        const state = get();
        if (state.currency === next) {
          return (
            state.fxSnapshot ?? {
              base: "USD",
              date: new Date().toISOString().slice(0, 10),
              rates: { USD: 1, BRL: 5.45, EUR: 0.92 },
              fetchedAt: new Date().toISOString(),
            }
          );
        }

        set({ isChangingCurrency: true });
        try {
          const snapshot = await fetchFxRates();
          const from = state.currency;
          const convertedKpis = convertKpis(state.kpis, from, next, snapshot.rates);
          const convertedOutside = Math.round(
            convertAmount(state.kpiOutsidePortfolio, from, next, snapshot.rates)
          );
          const convertedPortfolio = convertPortfolio(
            state.portfolio,
            next,
            snapshot.rates
          );

          const built = buildProjectionsFromState({
            ...state,
            kpis: convertedKpis,
            kpiOutsidePortfolio: convertedOutside,
            portfolio: convertedPortfolio,
          });

          let simPlayground = state.simPlayground;
          if (simPlayground.isActive && simPlayground.portfolio.length > 0) {
            const convertedSimKpis = convertKpis(
              simPlayground.kpis,
              from,
              next,
              snapshot.rates
            );
            const convertedSimOutside = Math.round(
              convertAmount(
                simPlayground.kpiOutsidePortfolio,
                from,
                next,
                snapshot.rates
              )
            );
            const convertedSimPortfolio = convertPortfolio(
              simPlayground.portfolio,
              next,
              snapshot.rates
            );
            simPlayground = rebuildSimPlayground({
              ...simPlayground,
              kpis: convertedSimKpis,
              kpiOutsidePortfolio: convertedSimOutside,
              portfolio: convertedSimPortfolio,
            });
          }

          set({
            currency: next,
            kpis: built.kpis,
            kpiOutsidePortfolio: convertedOutside,
            portfolio: convertedPortfolio,
            projections: built.projections,
            chartData: built.chartData,
            fxSnapshot: snapshot,
            isChangingCurrency: false,
            projectionRevision: state.projectionRevision + 1,
            monteCarlo: invalidateMonteCarlo(state.monteCarlo),
            activeStressTest: null,
            stressTestResults: [],
            simPlayground,
          });

          return snapshot;
        } catch (error) {
          set({ isChangingCurrency: false });
          throw error;
        }
      },

      setOnboardingStep: (step) =>
        set((state) => ({
          onboarding: { ...state.onboarding, currentStep: step },
        })),

      setDisclaimerAccepted: (accepted) =>
        set((state) => ({
          onboarding: { ...state.onboarding, disclaimerAccepted: accepted },
        })),

      completeOnboarding: () =>
        set((state) => ({
          onboarding: {
            ...state.onboarding,
            completed: true,
            currentStep: 2,
            disclaimerAccepted: true,
          },
        })),

      setKPI: (field, value) => {
        const state = get();
        let kpiOutsidePortfolio = state.kpiOutsidePortfolio;
        const before = state.kpis[field];
        let kpis = normalizeKpiValues({ ...state.kpis, [field]: value });

        if (field === "currentNetWorth") {
          kpiOutsidePortfolio = deriveOutsideFromManualNetWorth(
            value,
            state.portfolio
          );
        }

        const builtBefore = buildProjectionsFromState(state);
        const built = buildProjectionsFromState({
          ...state,
          kpis,
          kpiOutsidePortfolio,
        });
        const projBefore =
          builtBefore.projections[state.kpis.retirementAge - state.kpis.currentAge]
            ?.portfolioValue ??
          builtBefore.projections[builtBefore.projections.length - 1]
            ?.portfolioValue ??
          0;
        const projAfter =
          built.projections[state.kpis.retirementAge - state.kpis.currentAge]
            ?.portfolioValue ??
          built.projections[built.projections.length - 1]?.portfolioValue ??
          0;

        set({
          kpis: built.kpis,
          kpiOutsidePortfolio,
          projections: built.projections,
          chartData: built.chartData,
          projectionRevision: state.projectionRevision + 1,
          monteCarlo: invalidateMonteCarlo(state.monteCarlo),
          activeStressTest: null,
          stressTestResults: [],
          lastNeedleDelta: {
            field,
            before,
            after: value,
            projectedBefore: projBefore,
            projectedAfter: projAfter,
          },
        });
      },

      setActiveTab: (tab) => set({ activeTab: tab }),
      setActiveNav: (nav) => set({ activeNav: nav }),
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      toggleSidebarCollapsed: () =>
        set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
      setPortfolioSearchQuery: (query) =>
        set({ portfolioSearchQuery: query }),

      addPortfolioAsset: (asset) => {
        const state = get();
        const portfolio = [...state.portfolio, asset];
        const simulationIncludedAssetIds = [
          ...state.simulationIncludedAssetIds,
          asset.id,
        ];
        const built = buildProjectionsFromState({
          ...state,
          portfolio,
          simulationIncludedAssetIds,
        });
        set({
          portfolio,
          simulationIncludedAssetIds,
          kpis: built.kpis,
          projections: built.projections,
          chartData: built.chartData,
          projectionRevision: state.projectionRevision + 1,
          monteCarlo: invalidateMonteCarlo(state.monteCarlo),
        });
      },

      updatePortfolioAsset: (id, patch) => {
        const state = get();
        const portfolio = state.portfolio.map((a) =>
          a.id === id ? { ...a, ...patch } : a
        );
        const built = buildProjectionsFromState({ ...state, portfolio });
        set({
          portfolio,
          kpis: built.kpis,
          projections: built.projections,
          chartData: built.chartData,
          projectionRevision: state.projectionRevision + 1,
          monteCarlo: invalidateMonteCarlo(state.monteCarlo),
        });
      },

      refreshPortfolioPrices: async () => {
        const state = get();
        if (state.isRefreshingPrices) {
          return { updated: 0, skipped: 0 };
        }

        set({ isRefreshingPrices: true });

        try {
          const refreshable = state.portfolio.filter(
            (a) =>
              a.assetClass !== "cash" &&
              a.ticker !== "CASH" &&
              !isNonMarketAsset(a)
          );

          if (refreshable.length === 0) {
            set({
              isRefreshingPrices: false,
              portfolioLastRefreshedAt: new Date().toISOString(),
            });
            return { updated: 0, skipped: state.portfolio.length };
          }

          const { quotes, fetchedAt } = await fetchPortfolioQuotes(refreshable);
          const quoteMap = new Map(
            quotes.map((q) => [q.ticker.toUpperCase(), q])
          );

          let updated = 0;
          const portfolio = state.portfolio.map((asset) => {
            if (
              asset.assetClass === "cash" ||
              asset.ticker === "CASH" ||
              isNonMarketAsset(asset)
            ) {
              return asset;
            }

            const quote = findQuoteForAsset(asset.ticker, quoteMap);
            if (!quote) return asset;

            updated += 1;
            return {
              ...asset,
              previousPrice: asset.currentPrice,
              currentPrice: quote.price,
              currency: quote.currency,
              priceSource: quote.priceSource,
              lastPriceAt: fetchedAt,
            };
          });

          const built = buildProjectionsFromState({ ...state, portfolio });
          set({
            portfolio,
            kpis: built.kpis,
            projections: built.projections,
            chartData: built.chartData,
            portfolioLastRefreshedAt: fetchedAt,
            projectionRevision: state.projectionRevision + 1,
            monteCarlo: invalidateMonteCarlo(state.monteCarlo),
            isRefreshingPrices: false,
          });

          return {
            updated,
            skipped: state.portfolio.length - updated,
          };
        } catch {
          set({ isRefreshingPrices: false });
          throw new Error("Price refresh failed");
        }
      },

      removePortfolioAsset: (id) => {
        const state = get();
        const portfolio = state.portfolio.filter((a) => a.id !== id);
        const simulationIncludedAssetIds =
          state.simulationIncludedAssetIds.filter((aid) => aid !== id);
        const built = buildProjectionsFromState({
          ...state,
          portfolio,
          simulationIncludedAssetIds,
        });
        set({
          portfolio,
          simulationIncludedAssetIds,
          kpis: built.kpis,
          projections: built.projections,
          chartData: built.chartData,
          projectionRevision: state.projectionRevision + 1,
          monteCarlo: invalidateMonteCarlo(state.monteCarlo),
        });
      },

      setSimulationIncludedAssetIds: (ids) => {
        const state = get();
        const validIds = ids.filter((id) =>
          state.portfolio.some((a) => a.id === id)
        );
        if (validIds.length === 0) return;
        const built = buildProjectionsFromState({
          ...state,
          simulationIncludedAssetIds: validIds,
        });
        set({
          simulationIncludedAssetIds: validIds,
          projections: built.projections,
          chartData: built.chartData,
          projectionRevision: state.projectionRevision + 1,
          monteCarlo: invalidateMonteCarlo(state.monteCarlo),
          activeStressTest: null,
          stressTestResults: [],
        });
      },

      toggleSimulationAsset: (assetId) => {
        const state = get();
        const setIds = new Set(state.simulationIncludedAssetIds);
        if (setIds.has(assetId)) {
          if (setIds.size <= 1) return;
          setIds.delete(assetId);
        } else {
          setIds.add(assetId);
        }
        get().setSimulationIncludedAssetIds([...setIds]);
      },

      toggleSimulationAssetClass: (assetClass, include) => {
        const state = get();
        const classIds = state.portfolio
          .filter((a) => a.assetClass === assetClass)
          .map((a) => a.id);
        const setIds = new Set(state.simulationIncludedAssetIds);
        classIds.forEach((id) => {
          if (include) setIds.add(id);
          else setIds.delete(id);
        });
        get().setSimulationIncludedAssetIds([...setIds]);
      },

      recalculateProjections: () => {
        const state = get();
        const built = buildProjectionsFromState(state);
        set({
          kpis: built.kpis,
          projections: built.projections,
          chartData: built.chartData,
        });
      },

      runMonteCarlo: async () => {
        set((state) => ({
          monteCarlo: { ...state.monteCarlo, isRunning: true },
        }));
        await new Promise((r) => setTimeout(r, 1200));
        const state = get();
        const { effectiveKpis } = buildProjectionsFromState(state);
        const output = runMonteCarloSimulation(effectiveKpis);
        const built = buildProjectionsFromState({
          ...state,
          monteCarlo: { results: output.results },
        });
        set({
          chartData: built.chartData,
          projections: built.projections,
          projectionRevision: state.projectionRevision + 1,
          monteCarlo: {
            hasRun: true,
            isRunning: false,
            lastRunAt: new Date().toISOString(),
            results: output.results,
            distributions: output.distributions,
            target: output.target,
            iterations: 1000,
          },
        });
      },

      runStressTestById: (testId) => {
        const state = get();
        const { effectiveKpis } = buildProjectionsFromState(state);
        const result = runStressTest(
          testId,
          effectiveKpis,
          state.projections
        );
        set((s) => ({
          activeStressTest: testId,
          stressTestResults: [
            result,
            ...s.stressTestResults.filter((r) => r.testId !== testId),
          ],
        }));
      },

      setExporting: (exporting) => set({ isExporting: exporting }),

      ensureSimPlayground: () => {
        const state = get();
        if (state.simPlayground.isActive) {
          return;
        }
        set({
          simPlayground: snapshotFromRealState({
            kpis: state.kpis,
            kpiOutsidePortfolio: state.kpiOutsidePortfolio,
            portfolio: state.portfolio,
            simulationIncludedAssetIds: state.simulationIncludedAssetIds,
          }),
        });
      },

      copyPortfolioToSimulation: () => {
        const state = get();
        set({
          simPlayground: snapshotFromRealState({
            kpis: state.kpis,
            kpiOutsidePortfolio: state.kpiOutsidePortfolio,
            portfolio: state.portfolio,
            simulationIncludedAssetIds: state.simulationIncludedAssetIds,
          }),
        });
      },

      setSimKPI: (field, value) => {
        const state = get();
        let kpiOutsidePortfolio = state.simPlayground.kpiOutsidePortfolio;
        const kpis = normalizeKpiValues({
          ...state.simPlayground.kpis,
          [field]: value,
        });
        if (field === "currentNetWorth") {
          kpiOutsidePortfolio = deriveOutsideFromManualNetWorth(
            value,
            state.simPlayground.portfolio
          );
        }
        const next = rebuildSimPlayground({
          ...state.simPlayground,
          kpis,
          kpiOutsidePortfolio,
        });
        set({
          simPlayground: next,
          simUndoStack: pushSimUndo(state.simPlayground, state.simUndoStack),
        });
      },

      setSimPortfolioSearchQuery: (query) =>
        set((state) => ({
          simPlayground: {
            ...state.simPlayground,
            portfolioSearchQuery: query,
          },
        })),

      addSimPortfolioAsset: (asset) => {
        const state = get();
        const portfolio = [...state.simPlayground.portfolio, asset];
        const simulationIncludedAssetIds = [
          ...state.simPlayground.simulationIncludedAssetIds,
          asset.id,
        ];
        const next = rebuildSimPlayground({
          ...state.simPlayground,
          portfolio,
          simulationIncludedAssetIds,
        });
        set({ simPlayground: next });
      },

      updateSimPortfolioAsset: (id, patch) => {
        const state = get();
        const portfolio = state.simPlayground.portfolio.map((a) =>
          a.id === id ? { ...a, ...patch } : a
        );
        const next = rebuildSimPlayground({
          ...state.simPlayground,
          portfolio,
        });
        set({ simPlayground: next });
      },

      removeSimPortfolioAsset: (id) => {
        const state = get();
        const portfolio = state.simPlayground.portfolio.filter((a) => a.id !== id);
        const simulationIncludedAssetIds =
          state.simPlayground.simulationIncludedAssetIds.filter(
            (aid) => aid !== id
          );
        const next = rebuildSimPlayground({
          ...state.simPlayground,
          portfolio,
          simulationIncludedAssetIds,
        });
        set({ simPlayground: next });
      },

      refreshSimPortfolioPrices: async () => {
        const state = get();
        const sim = state.simPlayground;
        const refreshable = sim.portfolio.filter(
          (a) =>
            a.assetClass !== "cash" &&
            a.ticker !== "CASH" &&
            !isNonMarketAsset(a)
        );

        if (refreshable.length === 0) {
          set({
            simPlayground: {
              ...sim,
              portfolioLastRefreshedAt: new Date().toISOString(),
            },
          });
          return { updated: 0, skipped: sim.portfolio.length };
        }

        const { quotes, fetchedAt } = await fetchPortfolioQuotes(refreshable);
        const quoteMap = new Map(
          quotes.map((q) => [q.ticker.toUpperCase(), q])
        );

        let updated = 0;
        const portfolio = sim.portfolio.map((asset) => {
          if (
            asset.assetClass === "cash" ||
            asset.ticker === "CASH" ||
            isNonMarketAsset(asset)
          ) {
            return asset;
          }

          const quote = findQuoteForAsset(asset.ticker, quoteMap);
          if (!quote) return asset;

          updated += 1;
          return {
            ...asset,
            previousPrice: asset.currentPrice,
            currentPrice: quote.price,
            currency: quote.currency,
            priceSource: quote.priceSource,
            lastPriceAt: fetchedAt,
          };
        });

        const next = rebuildSimPlayground({
          ...sim,
          portfolio,
          portfolioLastRefreshedAt: fetchedAt,
        });
        set({ simPlayground: next });
        return {
          updated,
          skipped: sim.portfolio.length - updated,
        };
      },

      setSimSimulationIncludedAssetIds: (ids) => {
        const state = get();
        const validIds = ids.filter((id) =>
          state.simPlayground.portfolio.some((a) => a.id === id)
        );
        if (validIds.length === 0) return;
        const next = rebuildSimPlayground({
          ...state.simPlayground,
          simulationIncludedAssetIds: validIds,
        });
        set({ simPlayground: next });
      },

      toggleSimSimulationAsset: (assetId) => {
        const state = get();
        const setIds = new Set(state.simPlayground.simulationIncludedAssetIds);
        if (setIds.has(assetId)) {
          if (setIds.size <= 1) return;
          setIds.delete(assetId);
        } else {
          setIds.add(assetId);
        }
        get().setSimSimulationIncludedAssetIds([...setIds]);
      },

      toggleSimSimulationAssetClass: (assetClass, include) => {
        const state = get();
        const classIds = state.simPlayground.portfolio
          .filter((a) => a.assetClass === assetClass)
          .map((a) => a.id);
        const setIds = new Set(state.simPlayground.simulationIncludedAssetIds);
        classIds.forEach((id) => {
          if (include) setIds.add(id);
          else setIds.delete(id);
        });
        get().setSimSimulationIncludedAssetIds([...setIds]);
      },

      runSimMonteCarlo: async () => {
        const state = get();
        set({
          simPlayground: {
            ...state.simPlayground,
            monteCarlo: {
              ...state.simPlayground.monteCarlo,
              isRunning: true,
            },
          },
        });
        await new Promise((r) => setTimeout(r, 1200));
        const current = get();
        const { effectiveKpis } = buildPlaygroundProjections(
          current.simPlayground
        );
        const output = runMonteCarloSimulation(effectiveKpis);
        const built = buildPlaygroundProjections({
          ...current.simPlayground,
          monteCarlo: { results: output.results },
        });
        set({
          simPlayground: {
            ...current.simPlayground,
            chartData: built.chartData,
            projections: built.projections,
            projectionRevision: current.simPlayground.projectionRevision + 1,
            monteCarlo: {
              hasRun: true,
              isRunning: false,
              lastRunAt: new Date().toISOString(),
              results: output.results,
              distributions: output.distributions,
              target: output.target,
              iterations: 1000,
            },
          },
        });
      },

      runSimStressTestById: (testId) => {
        const state = get();
        const { effectiveKpis } = buildPlaygroundProjections(
          state.simPlayground
        );
        const result = runStressTest(
          testId,
          effectiveKpis,
          state.simPlayground.projections
        );
        set({
          simPlayground: {
            ...state.simPlayground,
            activeStressTest: testId,
            stressTestResults: [
              result,
              ...state.simPlayground.stressTestResults.filter(
                (r) => r.testId !== testId
              ),
            ],
          },
        });
      },
    }),
    {
      name: LOCAL_STORAGE_KEY,
      merge: (persisted, current) => {
        const p = persisted as Partial<AppStore> | undefined;
        const needsDemoMigration = (p?.demoSeedVersion ?? 0) < DEMO_SEED_VERSION;

        const portfolio = needsDemoMigration
          ? MOCK_PORTFOLIO
          : (p?.portfolio ?? MOCK_PORTFOLIO);
        const simulationIncludedAssetIds = needsDemoMigration
          ? defaultIncludedIds
          : (p?.simulationIncludedAssetIds ??
            getDefaultIncludedAssetIds(portfolio));
        const kpiOutsidePortfolio = needsDemoMigration
          ? 0
          : (p?.kpiOutsidePortfolio ?? 0);
        const kpis = needsDemoMigration
          ? seedKpis
          : normalizeKpiValues(p?.kpis);

        const built = buildProjectionsFromState({
          kpis,
          portfolio,
          simulationIncludedAssetIds,
          kpiOutsidePortfolio,
          sensitivity: p?.sensitivity ?? { cagr: null, inflation: null },
          monteCarlo: p?.monteCarlo,
        });

        const simPlayground = normalizeSimPlayground(
          needsDemoMigration ? undefined : p?.simPlayground,
          {
            kpis: built.kpis,
            kpiOutsidePortfolio,
            portfolio,
            simulationIncludedAssetIds,
          }
        );

        return {
          ...current,
          ...p,
          demoSeedVersion: DEMO_SEED_VERSION,
          portfolio,
          simulationIncludedAssetIds,
          kpiOutsidePortfolio,
          kpis: built.kpis,
          projections: built.projections,
          chartData: built.chartData,
          simPlayground,
        };
      },
      partialize: (state) => ({
        locale: state.locale,
        currency: state.currency,
        fxSnapshot: state.fxSnapshot,
        onboarding: state.onboarding,
        sidebarCollapsed: state.sidebarCollapsed,
        demoSeedVersion: state.demoSeedVersion,
        planTier: state.planTier,
        explainSimple: state.explainSimple,
        theme: state.theme,
        coachMarksDismissed: state.coachMarksDismissed,
        sensitivity: state.sensitivity,
        netWorthSnapshots: state.netWorthSnapshots,
        aiChatHistory: state.aiChatHistory,
        savedScenarios: state.savedScenarios,
        kpis: state.kpis,
        kpiOutsidePortfolio: state.kpiOutsidePortfolio,
        portfolio: state.portfolio,
        portfolioLastRefreshedAt: state.portfolioLastRefreshedAt,
        simulationIncludedAssetIds: state.simulationIncludedAssetIds,
        monteCarlo: state.monteCarlo,
        simPlayground: state.simPlayground,
      }),
    }
  )
);