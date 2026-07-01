import type { ScopePresetId } from "@/lib/simulationScope";
import type { AssetClass, KPIField, MonteCarloScenario, StressTestId } from "@/types";
import type { IncomeGapAnalysis } from "@/lib/incomeGoals";
import type { TaxRegion } from "@/lib/tax/estimates";
import { t, type AppLocale, type MessageKey } from "./messages";

const STRESS_TEST_LABEL_KEYS: Record<StressTestId, MessageKey> = {
  "market-crash": "stressTest.marketCrash.label",
  "stagflation": "stressTest.stagflation.label",
  "early-retirement": "stressTest.earlyRetirement.label",
};

const STRESS_TEST_DESC_KEYS: Record<StressTestId, MessageKey> = {
  "market-crash": "stressTest.marketCrash.desc",
  "stagflation": "stressTest.stagflation.desc",
  "early-retirement": "stressTest.earlyRetirement.desc",
};

const TAX_REGION_LABEL_KEYS: Record<TaxRegion, MessageKey> = {
  usa: "tax.region.usa.label",
  eu: "tax.region.eu.label",
  br: "tax.region.br.label",
};

const TAX_REGION_NOTES_KEYS: Record<TaxRegion, MessageKey> = {
  usa: "tax.notes.usa",
  eu: "tax.notes.eu",
  br: "tax.notes.br",
};

const CHART_SCENARIO_KEYS: Record<MonteCarloScenario, MessageKey> = {
  pessimistic: "chart.scenario.pessimistic",
  base: "chart.scenario.base",
  optimistic: "chart.scenario.optimistic",
};

const SCOPE_PRESET_KEYS: Record<ScopePresetId, MessageKey> = {
  all: "simulation.scope.preset.all",
  investmentsOnly: "simulation.scope.preset.investmentsOnly",
  liquidMarkets: "simulation.scope.preset.liquidMarkets",
};

const CHART_SCENARIO_DATA_KEYS = new Set(["value", "pessimistic", "optimistic"]);

export function getKpiLabel(locale: AppLocale, field: KPIField): string {
  return t(locale, `kpi.field.${field}` as MessageKey);
}

export function getAssetClassLabel(locale: AppLocale, cls: AssetClass): string {
  return t(locale, `assetClass.${cls}` as MessageKey);
}

export function getTaxEstimateLabel(locale: AppLocale, region: TaxRegion): string {
  return t(locale, TAX_REGION_LABEL_KEYS[region]);
}

export function getTaxEstimateNotes(locale: AppLocale, region: TaxRegion): string {
  return t(locale, TAX_REGION_NOTES_KEYS[region]);
}

export function getStressTestLabel(locale: AppLocale, id: StressTestId): string {
  return t(locale, STRESS_TEST_LABEL_KEYS[id]);
}

export function getStressTestDescription(locale: AppLocale, id: StressTestId): string {
  return t(locale, STRESS_TEST_DESC_KEYS[id]);
}

export function getChartScenarioLabel(
  locale: AppLocale,
  scenario: MonteCarloScenario
): string {
  return t(locale, CHART_SCENARIO_KEYS[scenario]);
}

export function getScopePresetLabel(
  locale: AppLocale,
  presetId: ScopePresetId
): string {
  return t(locale, SCOPE_PRESET_KEYS[presetId]);
}

export function resolveChartScenarioFromEntry(
  dataKey?: string,
  name?: string
): MonteCarloScenario | null {
  const key = dataKey ?? name ?? "";
  if (key === "pessimistic" || name === "Pessimistic") return "pessimistic";
  if (key === "optimistic" || name === "Optimistic") return "optimistic";
  if (key === "value" || key === "base" || name === "Base Case") return "base";
  return null;
}

export function isChartScenarioEntry(dataKey?: string, name?: string): boolean {
  const key = dataKey ?? "";
  if (CHART_SCENARIO_DATA_KEYS.has(key)) return true;
  return resolveChartScenarioFromEntry(dataKey, name) !== null;
}

export function getHelpGroupTitle(locale: AppLocale, groupId: string): string {
  const key = `help.group.${groupId}.title` as MessageKey;
  return t(locale, key);
}

export function getHelpGroupDescription(
  locale: AppLocale,
  groupId: string
): string {
  const key = `help.group.${groupId}.description` as MessageKey;
  return t(locale, key);
}

export function getPhysicalPresetLabel(
  locale: AppLocale,
  presetId: string
): string {
  const key = `portfolio.add.preset.${presetId}.label` as MessageKey;
  return t(locale, key);
}

export function getPhysicalPresetDescription(
  locale: AppLocale,
  presetId: string
): string {
  const key = `portfolio.add.preset.${presetId}.description` as MessageKey;
  return t(locale, key);
}

export function getPhysicalPresetDefaultName(
  locale: AppLocale,
  presetId: string
): string {
  const key = `portfolio.add.preset.${presetId}.defaultName` as MessageKey;
  return t(locale, key);
}

export function getIncomeStatusKey(
  analysis: Pick<IncomeGapAnalysis, "status" | "desired">
): MessageKey {
  if (analysis.desired <= 0) return "income.status.setGoal";
  switch (analysis.status) {
    case "ahead":
      return "income.status.ahead";
    case "on-track":
      return "income.status.onTrack";
    case "behind":
      return "income.status.behind";
    case "far-behind":
      return "income.status.farBehind";
    default:
      return "income.status.behind";
  }
}