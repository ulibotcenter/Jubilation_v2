"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { normalizeB3Ticker } from "@/lib/market/b3";
import type { QuoteResult } from "@/lib/market/types";
import { convertAmount, convertKpis } from "@/lib/fx/convert";
import { liveFxQuote, type FxSnapshot } from "@/lib/fx/types";
import { fetchFxRates } from "@/lib/fx/client";
import { fetchPortfolioQuotes } from "@/lib/marketClient";
import { isNonMarketAsset } from "@/lib/physicalAssetPresets";
import {
  deriveOutsideFromManualNetWorth,
  syncNetWorthWithPortfolio,
} from "@/lib/netWorthSync";
import {
  applyPortfolioCagrToKpis,
  normalizePortfolioCagr,
} from "@/lib/portfolioCagr";
import { normalizePortfolioAssets } from "@/lib/engine/liquidity";
import { ENGINE_VERSION } from "@/lib/engine/version";
import { createId } from "@/lib/engine/ids";
import { DEFAULT_TENANT, type Tenant } from "@/lib/engine/canonical";
import { todayIsoDate } from "@/lib/engine/provenance";
import {
  createPerson,
  householdFromKpis,
  isHousehold,
  syncHolderWithKpis,
  type Household,
  type HouseholdScope,
  type Person,
} from "@/lib/engine/household";
import type { Sex } from "@/lib/engine/inssTypes";
import { htmlLang } from "@/lib/i18n/htmlLang";
import { appendDatedValue } from "@/lib/datedValue";
import {
  householdFromOnboarding,
  kpisFromOnboarding,
  type OnboardingAnswers,
} from "@/lib/onboarding/plan";
import { partializePersistedState } from "@/lib/persist/partialize";
import { migratePersistedState, CURRENT_PERSIST_VERSION } from "@/lib/persist/migrate";
import type { CoachMessage } from "@/lib/ai/retirementCoach";
import type { AppLocale } from "@/lib/i18n/messages";
import type { PlanTier } from "@/lib/plans";
import {
  buildProjectionEngineConfig,
  runMonteCarloFromConfig,
} from "@/lib/projectionEngine";
import { chartDataWithMcBands } from "@/lib/projectionsExtended";
import { projectPlan } from "@/lib/engine/project";
import { percentile } from "@/lib/engine/monteCarlo";
import {
  buildPlaygroundProjections,
  initialPlaygroundFromMock,
  normalizeSimPlayground,
  snapshotFromRealState,
  type SimulationPlaygroundState,
} from "@/lib/simulationPlayground";
import {
  resolveSimulationKpis,
} from "@/lib/simulationScope";
import {
  DEFAULT_CURRENCY,
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
  type MonteCarloState,
  type NavItemId,
  type OnboardingStep,
  type PortfolioAsset,
  type ProjectionYear,
  type StressTestId,
  generateChartData,
  MONTE_CARLO_SCENARIO_LABELS,
  buildDistributionBins,
  normalizeKpiValues,
  runStressTest,
} from "@/types";
import { runStressTestFromConfig } from "@/lib/stressTest";
import type { Institution, FinancialAccount, Entitlement } from "@/lib/engine/canonical";

function compactPaths(
  paths: Map<number, number[]>
): Record<number, { p10: number; p50: number; p90: number }> {
  const out: Record<number, { p10: number; p50: number; p90: number }> = {};
  for (const [age, values] of paths) {
    const sorted = [...values].sort((a, b) => a - b);
    out[age] = {
      p10: Math.round(percentile(sorted, 0.1)),
      p50: Math.round(percentile(sorted, 0.5)),
      p90: Math.round(percentile(sorted, 0.9)),
    };
  }
  return out;
}

function monteCarloOutputFromEngine(
  engineConfig: ReturnType<typeof buildProjectionEngineConfig>,
  iterations = 1000
) {
  const output = runMonteCarloFromConfig(engineConfig, iterations);
  const distributions = {} as Record<MonteCarloScenario, DistributionBin[]>;
  for (const row of output.results) {
    distributions[row.scenario] = buildDistributionBins(
      output.finalValuesByScenario[row.scenario],
      output.target
    );
  }
  return {
    results: output.results.map((row) => ({
      ...row,
      label: MONTE_CARLO_SCENARIO_LABELS[row.scenario],
      finalValue: row.medianValue,
    })),
    distributions,
    target: output.target,
    pathsByAge: compactPaths(output.pathsByAge),
  };
}

const SEED_PORTFOLIO: PortfolioAsset[] = [];

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
    hasRun?: boolean;
    results: MonteCarloResult[];
    pathsByAge?: MonteCarloState["pathsByAge"];
  };
  currency?: Currency;
  fxSnapshot?: FxSnapshot | null;
  household?: Household | null;
}) {
  const quote = liveFxQuote(state.currency ?? "USD", state.fxSnapshot);
  const portfolio = normalizePortfolioAssets(
    normalizePortfolioCagr(state.portfolio)
  );
  const syncedKpis = applyPortfolioCagrToKpis(
    syncNetWorthWithPortfolio(
      normalizeKpiValues(state.kpis),
      portfolio,
      state.kpiOutsidePortfolio,
      quote
    ),
    portfolio
  );
  const sensitive = applySensitivity(
    syncedKpis,
    state.sensitivity ?? { cagr: null, inflation: null }
  );
  const effectiveKpis = resolveSimulationKpis(
    sensitive,
    portfolio,
    state.simulationIncludedAssetIds,
    state.kpiOutsidePortfolio,
    quote
  );
  const engineConfig = buildProjectionEngineConfig(
    effectiveKpis,
    portfolio,
    state.simulationIncludedAssetIds,
    state.kpiOutsidePortfolio,
    quote,
    { household: state.household }
  );
  if (state.sensitivity?.cagr != null) {
    const inflation = effectiveKpis.annualInflation / 100;
    engineConfig.plan = {
      ...engineConfig.plan,
      liquidRealReturn:
        (1 + state.sensitivity.cagr / 100) / (1 + inflation) - 1,
    };
    engineConfig.investableRealReturn = engineConfig.plan.liquidRealReturn;
  }
  const projected = projectPlan(engineConfig.plan).years;
  const mcBase =
    state.monteCarlo?.hasRun && (state.monteCarlo.results?.length ?? 0) > 0
      ? state.monteCarlo.results.find((r) => r.scenario === "base")
      : undefined;
  const chartData = chartDataWithMcBands(
    projected,
    mcBase?.percentile10,
    mcBase?.percentile90,
    engineConfig.plan.lifeExpectancy,
    mcBase?.medianValue,
    engineConfig,
    state.monteCarlo?.pathsByAge
  );
  return {
    kpis: syncedKpis,
    effectiveKpis,
    engineConfig,
    projections: projected,
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

function markMonteCarloStale(state: AppStore["monteCarlo"]) {
  if (!state.hasRun) return state;
  return { ...state, stale: true };
}

function mcBandsInput(monteCarlo: AppStore["monteCarlo"]) {
  return monteCarlo.hasRun && monteCarlo.results.length > 0
    ? { hasRun: true, results: monteCarlo.results }
    : undefined;
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
  projections: ProjectionYear[];
  chartData: ReturnType<typeof generateChartData>;
  monteCarlo: MonteCarloState;
  activeStressTest: StressTestId | null;
  stressTestResults: ReturnType<typeof runStressTest>[];
  isExporting: boolean;
  projectionRevision: number;
  fxSnapshot: FxSnapshot | null;
  isChangingCurrency: boolean;
  persistVersion: number;
  tenant: Tenant;
  institutions: Institution[];
  accounts: FinancialAccount[];
  entitlements: Entitlement[];
  household: Household;
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
  finishOnboarding: (answers: OnboardingAnswers) => void;
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
        | "expectedCAGR"
        | "realReturn"
        | "allowSale"
        | "liquidity"
        | "asOf"
      >
    >
  ) => void;
  removePortfolioAsset: (id: string) => void;
  refreshPortfolioPrices: () => Promise<{ updated: number; skipped: number }>;
  setSimulationIncludedAssetIds: (ids: string[]) => void;
  toggleSimulationAsset: (assetId: string) => void;
  toggleSimulationAssetClass: (assetClass: AssetClass, include: boolean) => void;
  setHouseholdScope: (scope: HouseholdScope) => void;
  addSpouse: (input: {
    displayName: string;
    sex: Sex;
    birthDate: string;
    lifeExpectancy?: number;
    marriageDate?: string | null;
  }) => void;
  removeSpouse: () => void;
  patchHouseholdPerson: (
    role: "holder" | "spouse",
    patch: Partial<Pick<Person, "displayName" | "sex" | "birthDate" | "lifeExpectancy" | "contributorKind">>
  ) => void;
  setMarriageDate: (date: string | null) => void;
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
        | "expectedCAGR"
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
    stale: false,
    results: [],
    distributions: null,
    target: null,
  };
}

function liveCtx(state: {
  currency: Currency;
  fxSnapshot?: FxSnapshot | null;
  household?: Household | null;
}) {
  return {
    currency: state.currency,
    fxSnapshot: state.fxSnapshot,
    household: state.household ?? null,
  };
}

function rebuildSimPlayground(
  sim: SimulationPlaygroundState,
  fx: {
    currency: Currency;
    fxSnapshot?: FxSnapshot | null;
    household?: Household | null;
  }
): SimulationPlaygroundState {
  const built = buildPlaygroundProjections({
    ...sim,
    currency: fx.currency,
    fxSnapshot: fx.fxSnapshot,
    household: fx.household,
    monteCarlo: sim.monteCarlo.hasRun
      ? { hasRun: true, results: sim.monteCarlo.results }
      : undefined,
  });
  return {
    ...sim,
    kpis: built.kpis,
    projections: built.projections,
    chartData: built.chartData,
    projectionRevision: sim.projectionRevision + 1,
    monteCarlo: sim.monteCarlo.hasRun
      ? { ...sim.monteCarlo, stale: true }
      : invalidateSimMonteCarlo(sim.monteCarlo),
    activeStressTest: null,
    stressTestResults: [],
  };
}

function rebuildWithHousehold<
  S extends {
    kpis: KPIValues;
    portfolio: PortfolioAsset[];
    simulationIncludedAssetIds: string[];
    kpiOutsidePortfolio: number;
    sensitivity: SensitivityState;
    monteCarlo: AppStore["monteCarlo"];
    currency: Currency;
    fxSnapshot: FxSnapshot | null;
    household: Household;
    simPlayground: SimulationPlaygroundState;
    projectionRevision: number;
  },
>(state: S, household: Household) {
  const built = buildProjectionsFromState({
    ...state,
    household,
  });
  const simPlayground = state.simPlayground.isActive
    ? rebuildSimPlayground(state.simPlayground, liveCtx({ ...state, household }))
    : state.simPlayground;
  return {
    household,
    kpis: built.kpis,
    projections: built.projections,
    chartData: built.chartData,
    projectionRevision: state.projectionRevision + 1,
    monteCarlo: markMonteCarloStale(state.monteCarlo),
    simPlayground,
  };
}

/** Empty holdings until the person types something. Demo Lamborghini/Trancoso is not the plan. */
const defaultIncludedIds: string[] = [];
const seedKpis = normalizeKpiValues({});
const initialOutside = 0;
const seedHousehold = householdFromKpis(seedKpis, todayIsoDate());
const initialBuild = buildProjectionsFromState({
  kpis: seedKpis,
  portfolio: SEED_PORTFOLIO,
  simulationIncludedAssetIds: defaultIncludedIds,
  kpiOutsidePortfolio: initialOutside,
  sensitivity: { cagr: null, inflation: null },
  household: seedHousehold,
});

export const useAppStore = create<AppStore>()(
  persist(
    (set, get) => ({
      locale: DEFAULT_LOCALE,
      currency: DEFAULT_CURRENCY,
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
      portfolio: SEED_PORTFOLIO,
      portfolioSearchQuery: "",
      portfolioLastRefreshedAt: null,
      isRefreshingPrices: false,
      simulationIncludedAssetIds: defaultIncludedIds,
      projections: initialBuild.projections,
      chartData: initialBuild.chartData,
      monteCarlo: {
        hasRun: false,
        isRunning: false,
        stale: false,
        lastRunAt: null,
        results: [],
        distributions: null,
        target: null,
        iterations: 1000,
        seed: 1,
        engineVersion: ENGINE_VERSION,
        pathsByAge: null,
      },
      activeStressTest: null,
      stressTestResults: [],
      isExporting: false,
      projectionRevision: 0,
      fxSnapshot: null,
      isChangingCurrency: false,
      persistVersion: CURRENT_PERSIST_VERSION,
      tenant: DEFAULT_TENANT,
      institutions: [],
      accounts: [],
      entitlements: [],
      household: seedHousehold,
      planTier: "free",
      explainSimple: false,
      theme: "light",
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
        SEED_PORTFOLIO,
        defaultIncludedIds,
        DEFAULT_CURRENCY,
        null,
        seedHousehold
      ),

      setLocale: (locale) => {
        set({ locale });
        if (typeof document !== "undefined") {
          document.documentElement.lang = htmlLang(locale);
        }
      },

      setPlanTier: () => set({ planTier: "free" }),

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
          kpis: state.kpis,
          portfolio: state.portfolio,
          simulationIncludedAssetIds: state.simulationIncludedAssetIds,
          kpiOutsidePortfolio: state.kpiOutsidePortfolio,
          sensitivity,
          monteCarlo: mcBandsInput(state.monteCarlo),
          household: state.household,
        });
        set({
          sensitivity,
          kpis: built.kpis,
          projections: built.projections,
          chartData: built.chartData,
          projectionRevision: state.projectionRevision + 1,
          monteCarlo: markMonteCarloStale(state.monteCarlo),
        });
      },

      resetSensitivity: () => {
        const state = get();
        const built = buildProjectionsFromState({
          kpis: state.kpis,
          portfolio: state.portfolio,
          simulationIncludedAssetIds: state.simulationIncludedAssetIds,
          kpiOutsidePortfolio: state.kpiOutsidePortfolio,
          sensitivity: { cagr: null, inflation: null },
          monteCarlo: mcBandsInput(state.monteCarlo),
          household: state.household,
        });
        set({
          sensitivity: { cagr: null, inflation: null },
          projections: built.projections,
          chartData: built.chartData,
          projectionRevision: state.projectionRevision + 1,
          monteCarlo: markMonteCarloStale(state.monteCarlo),
        });
      },

      addNetWorthSnapshot: (value) =>
        set((s) => ({
          netWorthSnapshots: [
            ...s.netWorthSnapshots,
            {
              id: createId("snap"),
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
          id: createId("sc"),
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

          const built = buildProjectionsFromState({
            ...state,
            kpis: convertedKpis,
            kpiOutsidePortfolio: convertedOutside,
            currency: next,
            fxSnapshot: snapshot,
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
            simPlayground = rebuildSimPlayground(
              {
                ...simPlayground,
                kpis: convertedSimKpis,
                kpiOutsidePortfolio: convertedSimOutside,
                portfolio: simPlayground.portfolio,
              },
              { currency: next, fxSnapshot: snapshot, household: state.household }
            );
          }

          set({
            currency: next,
            kpis: built.kpis,
            kpiOutsidePortfolio: convertedOutside,
            projections: built.projections,
            chartData: built.chartData,
            fxSnapshot: snapshot,
            isChangingCurrency: false,
            projectionRevision: state.projectionRevision + 1,
            monteCarlo: markMonteCarloStale(state.monteCarlo),
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

      finishOnboarding: (answers) => {
        const state = get();
        const asOf = todayIsoDate();
        const kpis = kpisFromOnboarding(answers);
        const household = householdFromOnboarding(
          answers,
          asOf,
          state.household
        );
        const portfolio: PortfolioAsset[] = [];
        const simulationIncludedAssetIds: string[] = [];
        const built = buildProjectionsFromState({
          ...state,
          kpis,
          portfolio,
          simulationIncludedAssetIds,
          kpiOutsidePortfolio: 0,
          household,
        });
        set({
          kpis: built.kpis,
          household,
          portfolio,
          simulationIncludedAssetIds,
          kpiOutsidePortfolio: 0,
          projections: built.projections,
          chartData: built.chartData,
          projectionRevision: state.projectionRevision + 1,
          monteCarlo: markMonteCarloStale(state.monteCarlo),
          onboarding: {
            ...state.onboarding,
            completed: true,
            currentStep: 2,
            disclaimerAccepted: true,
          },
        });
      },

      setKPI: (field, value) => {
        const state = get();
        let kpiOutsidePortfolio = state.kpiOutsidePortfolio;
        const before = state.kpis[field];
        const kpis = normalizeKpiValues({ ...state.kpis, [field]: value });
        let household = state.household;
        if (field === "currentAge" || field === "lifeExpectancy") {
          household = syncHolderWithKpis(
            household,
            kpis,
            household.holder.asOf
          );
        }

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
          household,
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
          household,
          projections: built.projections,
          chartData: built.chartData,
          projectionRevision: state.projectionRevision + 1,
          monteCarlo: markMonteCarloStale(state.monteCarlo),
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
          monteCarlo: markMonteCarloStale(state.monteCarlo),
        });
      },

      updatePortfolioAsset: (id, patch) => {
        const state = get();
        const asOf = todayIsoDate();
        const portfolio = state.portfolio.map((a) => {
          if (a.id !== id) return a;
          let next = { ...a, ...patch };
          if (patch.realReturn != null && patch.realReturn !== a.realReturn) {
            next.expectedCAGR = Math.round(
              ((1 + patch.realReturn / 100) *
                (1 + state.kpis.annualInflation / 100) -
                1) *
                1000
            ) / 10;
          }
          if (
            patch.currentPrice != null &&
            patch.currentPrice !== a.currentPrice
          ) {
            next = appendDatedValue(
              next,
              next.quantity * next.currentPrice,
              patch.asOf ?? asOf
            );
          }
          return next;
        });
        const built = buildProjectionsFromState({
          ...state,
          portfolio,
          monteCarlo: mcBandsInput(state.monteCarlo),
        });
        set({
          portfolio,
          kpis: built.kpis,
          projections: built.projections,
          chartData: built.chartData,
          projectionRevision: state.projectionRevision + 1,
          monteCarlo: markMonteCarloStale(state.monteCarlo),
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
            const native = asset.nativeCurrency ?? asset.currency;
            if (quote.currency !== native) return asset;
            return {
              ...asset,
              previousPrice: asset.currentPrice,
              currentPrice: quote.price,
              nativeCurrency: native,
              currency: native,
              priceSource: quote.priceSource,
              lastPriceAt: fetchedAt,
              asOf: fetchedAt.slice(0, 10),
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
            monteCarlo: markMonteCarloStale(state.monteCarlo),
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
          monteCarlo: markMonteCarloStale(state.monteCarlo),
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
          monteCarlo: markMonteCarloStale(state.monteCarlo),
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

      setHouseholdScope: (scope) => {
        const state = get();
        if (scope !== "holder" && !state.household.spouse) return;
        set(rebuildWithHousehold(state, { ...state.household, scope }));
      },

      addSpouse: (input) => {
        const state = get();
        const asOf = todayIsoDate();
        const spouse = createPerson({
          role: "spouse",
          displayName: input.displayName.trim() || "Spouse",
          sex: input.sex,
          birthDate: input.birthDate,
          asOf,
          lifeExpectancy: input.lifeExpectancy,
        });
        set(
          rebuildWithHousehold(state, {
            ...state.household,
            spouse,
            marriageDate: input.marriageDate ?? state.household.marriageDate,
          })
        );
      },

      removeSpouse: () => {
        const state = get();
        set(
          rebuildWithHousehold(state, {
            ...state.household,
            spouse: null,
            marriageDate: null,
            scope: "holder",
          })
        );
      },

      patchHouseholdPerson: (role, patch) => {
        const state = get();
        if (role === "spouse" && !state.household.spouse) return;
        const current =
          role === "holder" ? state.household.holder : state.household.spouse!;
        const nextPerson = { ...current, ...patch, asOf: todayIsoDate() };
        set(
          rebuildWithHousehold(state, {
            ...state.household,
            holder: role === "holder" ? nextPerson : state.household.holder,
            spouse: role === "spouse" ? nextPerson : state.household.spouse,
          })
        );
      },

      setMarriageDate: (date) => {
        const state = get();
        set(
          rebuildWithHousehold(state, {
            ...state.household,
            marriageDate: date,
          })
        );
      },

      recalculateProjections: () => {
        const state = get();
        const built = buildProjectionsFromState({
          kpis: state.kpis,
          portfolio: state.portfolio,
          simulationIncludedAssetIds: state.simulationIncludedAssetIds,
          kpiOutsidePortfolio: state.kpiOutsidePortfolio,
          sensitivity: state.sensitivity,
          monteCarlo: mcBandsInput(state.monteCarlo),
          household: state.household,
        });
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
        const builtState = buildProjectionsFromState(state);
        const output = monteCarloOutputFromEngine(builtState.engineConfig);
        const built = buildProjectionsFromState({
          ...state,
          monteCarlo: {
            hasRun: true,
            results: output.results,
            pathsByAge: output.pathsByAge,
          },
        });
        set({
          chartData: built.chartData,
          projections: built.projections,
          projectionRevision: state.projectionRevision + 1,
          monteCarlo: {
            hasRun: true,
            isRunning: false,
            stale: false,
            lastRunAt: new Date().toISOString(),
            results: output.results,
            distributions: output.distributions,
            target: output.target,
            iterations: 1000,
            seed: 1,
            engineVersion: ENGINE_VERSION,
            pathsByAge: output.pathsByAge,
          },
        });
      },

      runStressTestById: (testId) => {
        const state = get();
        const builtState = buildProjectionsFromState(state);
        const result = runStressTestFromConfig(
          testId,
          builtState.engineConfig
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
            currency: state.currency,
            fxSnapshot: state.fxSnapshot,
            household: state.household,
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
            currency: state.currency,
            fxSnapshot: state.fxSnapshot,
            household: state.household,
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
        const next = rebuildSimPlayground(
          {
            ...state.simPlayground,
            kpis,
            kpiOutsidePortfolio,
          },
          { currency: state.currency, fxSnapshot: state.fxSnapshot, household: state.household }
        );
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
        const next = rebuildSimPlayground(
          {
            ...state.simPlayground,
            portfolio,
            simulationIncludedAssetIds,
          },
          { currency: state.currency, fxSnapshot: state.fxSnapshot, household: state.household }
        );
        set({ simPlayground: next });
      },

      updateSimPortfolioAsset: (id, patch) => {
        const state = get();
        const portfolio = state.simPlayground.portfolio.map((a) =>
          a.id === id ? { ...a, ...patch } : a
        );
        const next = rebuildSimPlayground(
          {
            ...state.simPlayground,
            portfolio,
          },
          { currency: state.currency, fxSnapshot: state.fxSnapshot, household: state.household }
        );
        set({ simPlayground: next });
      },

      removeSimPortfolioAsset: (id) => {
        const state = get();
        const portfolio = state.simPlayground.portfolio.filter((a) => a.id !== id);
        const simulationIncludedAssetIds =
          state.simPlayground.simulationIncludedAssetIds.filter(
            (aid) => aid !== id
          );
        const next = rebuildSimPlayground(
          {
            ...state.simPlayground,
            portfolio,
            simulationIncludedAssetIds,
          },
          { currency: state.currency, fxSnapshot: state.fxSnapshot, household: state.household }
        );
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
          const native = asset.nativeCurrency ?? asset.currency;
          if (quote.currency !== native) return asset;
          return {
            ...asset,
            previousPrice: asset.currentPrice,
            currentPrice: quote.price,
            nativeCurrency: native,
            currency: native,
            priceSource: quote.priceSource,
            lastPriceAt: fetchedAt,
            asOf: fetchedAt.slice(0, 10),
          };
        });

        const next = rebuildSimPlayground(
          {
            ...sim,
            portfolio,
            portfolioLastRefreshedAt: fetchedAt,
          },
          { currency: state.currency, fxSnapshot: state.fxSnapshot, household: state.household }
        );
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
        const next = rebuildSimPlayground(
          {
            ...state.simPlayground,
            simulationIncludedAssetIds: validIds,
          },
          { currency: state.currency, fxSnapshot: state.fxSnapshot, household: state.household }
        );
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
        const builtPg = buildPlaygroundProjections({
          ...current.simPlayground,
          currency: current.currency,
          fxSnapshot: current.fxSnapshot,
        });
        const output = monteCarloOutputFromEngine(builtPg.engineConfig);
        const built = buildPlaygroundProjections({
          ...current.simPlayground,
          currency: current.currency,
          fxSnapshot: current.fxSnapshot,
          monteCarlo: {
            hasRun: true,
            results: output.results,
            pathsByAge: output.pathsByAge,
          },
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
              stale: false,
              lastRunAt: new Date().toISOString(),
              results: output.results,
              distributions: output.distributions,
              target: output.target,
              iterations: 1000,
              pathsByAge: output.pathsByAge,
            },
          },
        });
      },

      runSimStressTestById: (testId) => {
        const state = get();
        const { effectiveKpis } = buildPlaygroundProjections({
          ...state.simPlayground,
          currency: state.currency,
          fxSnapshot: state.fxSnapshot,
        });
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
      version: CURRENT_PERSIST_VERSION,
      migrate: (persisted, fromVersion) =>
        migratePersistedState(persisted, fromVersion) as never,
      merge: (persisted, current) => {
        const migrated = migratePersistedState(
          persisted,
          CURRENT_PERSIST_VERSION
        ) as Partial<AppStore>;
        const portfolio = normalizePortfolioAssets(
          normalizePortfolioCagr(migrated.portfolio ?? current.portfolio)
        );
        const simulationIncludedAssetIds =
          migrated.simulationIncludedAssetIds ??
          current.simulationIncludedAssetIds;
        const kpiOutsidePortfolio =
          migrated.kpiOutsidePortfolio ?? current.kpiOutsidePortfolio;
        const kpis = normalizeKpiValues(migrated.kpis ?? current.kpis);
        const asOf = todayIsoDate();
        const household = isHousehold(migrated.household)
          ? migrated.household
          : isHousehold(current.household)
            ? current.household
            : householdFromKpis(kpis, asOf);

        const persistedMc = migrated.monteCarlo;
        const built = buildProjectionsFromState({
          kpis,
          portfolio,
          simulationIncludedAssetIds,
          kpiOutsidePortfolio,
          sensitivity: migrated.sensitivity ?? { cagr: null, inflation: null },
          monteCarlo:
            persistedMc?.hasRun && persistedMc.results?.length
              ? {
                  hasRun: true,
                  results: persistedMc.results,
                  pathsByAge: persistedMc.pathsByAge,
                }
              : undefined,
          currency: migrated.currency ?? current.currency,
          fxSnapshot: migrated.fxSnapshot ?? current.fxSnapshot,
          household,
        });

        const simPlayground = normalizeSimPlayground(migrated.simPlayground, {
          kpis: built.kpis,
          kpiOutsidePortfolio,
          portfolio,
          simulationIncludedAssetIds,
          currency: migrated.currency ?? current.currency,
          fxSnapshot: migrated.fxSnapshot ?? current.fxSnapshot,
          household,
        });

        const monteCarlo = persistedMc
          ? { ...persistedMc, stale: persistedMc.stale ?? false }
          : current.monteCarlo;

        return {
          ...current,
          ...migrated,
          persistVersion: CURRENT_PERSIST_VERSION,
          planTier: "free",
          user: migrated.user ?? current.user,
          tenant: migrated.tenant ?? DEFAULT_TENANT,
          institutions: migrated.institutions ?? [],
          accounts: migrated.accounts ?? [],
          entitlements: migrated.entitlements ?? [],
          household,
          portfolio,
          simulationIncludedAssetIds,
          kpiOutsidePortfolio,
          kpis: built.kpis,
          projections: built.projections,
          chartData: built.chartData,
          monteCarlo,
          simPlayground,
        };
      },
      partialize: (state) => partializePersistedState(state),
    }
  )
);