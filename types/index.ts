// ─────────────────────────────────────────────────────────────
// Jubilation V2 — Core Type Definitions
// English-first · i18n-ready (future: next-intl PT/ES)
// ─────────────────────────────────────────────────────────────

// ─── i18n (future: next-intl) ────────────────────────────────

/** Supported locales — EN launch, PT/ES planned */
export type Locale = "en" | "pt" | "es";

export const DEFAULT_LOCALE: Locale = "en";

// ─── Currency ──────────────────────────────────────────────

export type Currency = "BRL" | "USD" | "EUR";

export interface CurrencyOption {
  code: Currency;
  symbol: string;
  label: string;
  /** Display name for dropdown — i18n key: `currency.${code}` */
  name: string;
}

export const CURRENCIES: CurrencyOption[] = [
  { code: "USD", symbol: "$", label: "USD", name: "US Dollar" },
  { code: "BRL", symbol: "R$", label: "BRL", name: "Brazilian Real" },
  { code: "EUR", symbol: "€", label: "EUR", name: "Euro" },
];

export const CURRENCY_SYMBOLS: Record<Currency, string> = {
  USD: "$",
  BRL: "R$",
  EUR: "€",
};

// ─── Subscription Plans ─────────────────────────────────────
// Single source of truth lives in lib/plans. Billing is not active;
// this alias exists so UserProfile and the store share one enum.

import type { PlanTier } from "@/lib/plans";
export type { PlanTier };

// ─── Navigation ────────────────────────────────────────────

export type NavItemId =
  | "dashboard"
  | "portfolio"
  | "simulation"
  | "cashflow"
  | "settings"
  | "help";

export interface NavItem {
  id: NavItemId;
  label: string;
  href: string;
  icon: string;
  /** Visible in sidebar — some items are tab-only */
  showInSidebar: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    href: "/",
    icon: "LayoutDashboard",
    showInSidebar: true,
  },
  {
    id: "portfolio",
    label: "Portfolio",
    href: "/#portfolio",
    icon: "Briefcase",
    showInSidebar: true,
  },
  {
    id: "simulation",
    label: "Simulation",
    href: "/simulation",
    icon: "LineChart",
    showInSidebar: true,
  },
  {
    id: "cashflow",
    label: "Cash Flow",
    href: "/cash-flow",
    icon: "Waves",
    showInSidebar: true,
  },
  {
    id: "settings",
    label: "Settings",
    href: "/settings",
    icon: "Settings",
    showInSidebar: true,
  },
  {
    id: "help",
    label: "Help",
    href: "/help",
    icon: "HelpCircle",
    showInSidebar: true,
  },
];

// ─── KPI Fields ────────────────────────────────────────────

export type KPIField =
  | "currentAge"
  | "retirementAge"
  | "lifeExpectancy"
  | "currentNetWorth"
  | "monthlyContribution"
  | "monthlyExpenses"
  | "desiredMonthlyIncome"
  | "expectedCAGR"
  | "annualInflation";

export const DEFAULT_LIFE_EXPECTANCY = 90;

export type AssumptionImpact = "simple" | "high";

export interface KPIConfig {
  field: KPIField;
  label: string;
  suffix?: string;
  prefix?: string;
  min: number;
  max: number;
  step: number;
  decimals: number;
  format: "integer" | "currency" | "percent";
  /** High-impact premises are editable — the UI only signals them. */
  impact: AssumptionImpact;
}

export const KPI_CONFIGS: KPIConfig[] = [
  {
    field: "currentAge",
    label: "Current Age",
    min: 18,
    max: 80,
    step: 1,
    decimals: 0,
    format: "integer",
    impact: "simple",
  },
  {
    field: "retirementAge",
    label: "Retirement Age",
    min: 40,
    max: 90,
    step: 1,
    decimals: 0,
    format: "integer",
    impact: "simple",
  },
  {
    field: "lifeExpectancy",
    label: "Life Expectancy",
    min: 55,
    max: 120,
    step: 1,
    decimals: 0,
    format: "integer",
    impact: "high",
  },
  {
    field: "currentNetWorth",
    label: "Current Net Worth",
    min: 0,
    max: 100_000_000,
    step: 1000,
    decimals: 0,
    format: "currency",
    impact: "simple",
  },
  {
    field: "monthlyContribution",
    label: "Monthly Contribution",
    min: 0,
    max: 500_000,
    step: 100,
    decimals: 0,
    format: "currency",
    impact: "simple",
  },
  {
    field: "monthlyExpenses",
    label: "Monthly Living Expenses",
    min: 0,
    max: 500_000,
    step: 100,
    decimals: 0,
    format: "currency",
    impact: "simple",
  },
  {
    field: "desiredMonthlyIncome",
    label: "Desired Retirement Income",
    min: 0,
    max: 500_000,
    step: 100,
    decimals: 0,
    format: "currency",
    impact: "simple",
  },
  {
    field: "expectedCAGR",
    label: "Expected CAGR",
    suffix: "%",
    min: -10,
    max: 30,
    step: 0.1,
    decimals: 1,
    format: "percent",
    impact: "high",
  },
  {
    field: "annualInflation",
    label: "Annual Inflation",
    suffix: "%",
    min: 0,
    max: 20,
    step: 0.1,
    decimals: 1,
    format: "percent",
    impact: "high",
  },
];

export interface KPIGroup {
  id: "timeline" | "wealth" | "returns";
  label: string;
  fields: KPIField[];
}

/** Grouped layout — avoids orphan cards when field count ≠ column count */
export const KPI_GROUPS: KPIGroup[] = [
  {
    id: "timeline",
    label: "Timeline",
    fields: ["currentAge", "retirementAge", "lifeExpectancy"],
  },
  {
    id: "wealth",
    label: "Wealth & cash flow",
    fields: ["currentNetWorth", "monthlyContribution", "desiredMonthlyIncome"],
  },
  {
    id: "returns",
    label: "Market assumptions",
    fields: ["expectedCAGR", "annualInflation"],
  },
];

export interface KPIValues {
  currentAge: number;
  retirementAge: number;
  /** Planning horizon — charts and drawdown run through this age */
  lifeExpectancy: number;
  currentNetWorth: number;
  monthlyContribution: number;
  /** Average monthly living costs (lifestyle burn, not portfolio withdrawals) */
  monthlyExpenses: number;
  /** User's target monthly income at retirement */
  desiredMonthlyIncome: number;
  expectedCAGR: number;
  annualInflation: number;
}

export const DEFAULT_KPI_VALUES: KPIValues = {
  currentAge: 42,
  retirementAge: 60,
  lifeExpectancy: DEFAULT_LIFE_EXPECTANCY,
  currentNetWorth: 810_000,
  monthlyContribution: 4_500,
  monthlyExpenses: 9_500,
  desiredMonthlyIncome: 7_000,
  /** Nominal; engine converts via Fisher. 7.1% ≈ 4% real at 3% inflation. */
  expectedCAGR: 7.1,
  annualInflation: 3.0,
};

export function normalizeKpiValues(partial?: Partial<KPIValues>): KPIValues {
  const merged = { ...DEFAULT_KPI_VALUES, ...partial };
  const currentAge = Math.max(18, Math.min(80, merged.currentAge));
  const retirementAge = Math.max(
    currentAge + 1,
    Math.min(Math.max(55, Math.min(120, merged.lifeExpectancy)) - 1, merged.retirementAge)
  );
  const lifeExpectancy = Math.max(
    retirementAge + 1,
    Math.max(55, Math.min(120, merged.lifeExpectancy))
  );
  return { ...merged, currentAge, retirementAge, lifeExpectancy };
}

// ─── Portfolio Assets ──────────────────────────────────────

export type AssetClass =
  | "stocks"
  | "bonds"
  | "etf"
  | "bdr"
  | "funds"
  | "commodities"
  | "reit"
  | "real_estate"
  | "personal"
  | "crypto"
  | "cash"
  | "other";

export type PriceSource = "yahoo" | "coingecko" | "manual";
export type Liquidity = "liquid" | "illiquid";
export type DataSource =
  | "MANUAL"
  | "ESTIMATED"
  | "DERIVED"
  | "B3_API"
  | "OPEN_FINANCE"
  | "FILE_OFX"
  | "FILE_CNIS"
  | "FILE_IRPF"
  | "YAHOO"
  | "COINGECKO";
export type Confidence = "high" | "medium" | "low";

export interface PortfolioAsset {
  id: string;
  ticker: string;
  name: string;
  assetClass: AssetClass;
  quantity: number;
  currentPrice: number;
  costBasis: number;
  /** Native currency of the holding — never rewritten on FX display change */
  currency: Currency;
  nativeCurrency?: Currency;
  /** Allocation weight 0–100 */
  allocation: number;
  /** Expected nominal annual return (%) for this holding */
  expectedCAGR?: number;
  priceSource?: PriceSource;
  lastPriceAt?: string | null;
  previousPrice?: number | null;
  liquidity?: Liquidity;
  transactionCostRate?: number;
  allowSale?: boolean;
  scheduledSaleOn?: string | null;
  source?: DataSource;
  asOf?: string;
  confidence?: Confidence;
  externalRef?: string | null;
  institutionId?: string | null;
  accountId?: string | null;
  ownership?: "holder" | "spouse" | "joint";
}

export interface TickerSearchResult {
  ticker: string;
  name: string;
  assetClass: AssetClass;
  exchange: string;
  currentPrice: number;
  currency: Currency;
}

export const ASSET_CLASS_LABELS: Record<AssetClass, string> = {
  stocks: "Stocks",
  bonds: "Bonds",
  etf: "ETF",
  bdr: "BDR",
  funds: "Funds",
  commodities: "Commodities",
  reit: "REITs",
  real_estate: "Real Estate",
  personal: "Personal Property",
  crypto: "Crypto",
  cash: "Cash",
  other: "Other",
};

// ─── Simulation & Projections ──────────────────────────────

export interface ProjectionYear {
  year: number;
  age: number;
  /** Real (today's money). Same unit as inflationAdjusted. */
  portfolioValue: number;
  contributions: number;
  returns: number;
  /** Real value — equal to portfolioValue. Never deflate a real series twice. */
  inflationAdjusted: number;
  /** Nominal counterpart, derived as real × inflation factor. */
  nominalValue: number;
  /** Annual living expenses (accumulation: reference) or net withdrawal (retirement) */
  expenses: number;
  /** Annual amount invested into the portfolio */
  invested: number;
  /** Implied gross income need: expenses + invested */
  requiredIncome: number;
  taxes: number;
  liquidValue: number;
  illiquidValue: number;
  ruined: boolean;
}

export interface ChartDataPoint {
  year: number;
  age: number;
  value: number;
  pessimistic?: number;
  optimistic?: number;
  /** Stacked band height: optimistic − pessimistic */
  band?: number;
  /** Cash flow mini-chart — lifestyle stack */
  expenses?: number;
  invested?: number;
  /** Market growth on portfolio (volatile component) */
  returns?: number;
  requiredIncome?: number;
}

export type DashboardTab = "real-portfolio" | "simulation";

// ─── Monte Carlo ───────────────────────────────────────────

export type MonteCarloScenario = "pessimistic" | "base" | "optimistic";

export interface MonteCarloResult {
  scenario: MonteCarloScenario;
  label: string;
  finalValue: number;
  medianValue: number;
  successRate: number;
  percentile10: number;
  percentile90: number;
}

export interface DistributionBin {
  label: string;
  min: number;
  max: number;
  midpoint: number;
  count: number;
  meetsTarget: boolean;
}

export interface MonteCarloSimulationOutput {
  results: MonteCarloResult[];
  distributions: Record<MonteCarloScenario, DistributionBin[]>;
  target: number | null;
}

export interface MonteCarloState {
  hasRun: boolean;
  isRunning: boolean;
  stale: boolean;
  lastRunAt: string | null;
  results: MonteCarloResult[];
  distributions: Record<MonteCarloScenario, DistributionBin[]> | null;
  target: number | null;
  iterations: number;
  seed?: number;
  engineVersion?: string;
  pathsByAge?: Record<number, { p10: number; p50: number; p90: number }> | null;
}

export const MONTE_CARLO_SCENARIO_LABELS: Record<MonteCarloScenario, string> = {
  pessimistic: "Pessimistic",
  base: "Base Case",
  optimistic: "Optimistic",
};

export const MONTE_CARLO_SCENARIO_MULTIPLIERS: Record<
  MonteCarloScenario,
  { cagrOffset: number; volatility: number }
> = {
  pessimistic: { cagrOffset: -3.5, volatility: 0.22 },
  base: { cagrOffset: 0, volatility: 0.15 },
  optimistic: { cagrOffset: 2.5, volatility: 0.12 },
};

// ─── Stress Tests ──────────────────────────────────────────

export type StressTestId =
  | "market-crash"
  | "stagflation"
  | "early-retirement";

export interface StressTest {
  id: StressTestId;
  label: string;
  description: string;
  /** Impact modifier applied to CAGR (percentage points) */
  cagrImpact: number;
  /** Additional inflation shock (percentage points) */
  inflationImpact: number;
  /** One-time portfolio drawdown (percentage) */
  drawdown: number;
}

export const STRESS_TESTS: StressTest[] = [
  {
    id: "market-crash",
    label: "Market Crash",
    description: "Simulates a 40% drawdown with 2 years of recovery delay",
    cagrImpact: -4,
    inflationImpact: 0,
    drawdown: 40,
  },
  {
    id: "stagflation",
    label: "Stagflation",
    description: "High inflation (8%) with muted returns for 5 years",
    cagrImpact: -2,
    inflationImpact: 5,
    drawdown: 15,
  },
  {
    id: "early-retirement",
    label: "Early Retirement",
    description: "Forced retirement 5 years earlier with reduced contributions",
    cagrImpact: -1,
    inflationImpact: 0,
    drawdown: 0,
  },
];

export interface StressTestResult {
  testId: StressTestId;
  originalValue: number;
  stressedValue: number;
  shortfall: number;
  stillOnTrack: boolean;
  ruinAge?: number | null;
  target?: number | null;
}

// ─── Onboarding ────────────────────────────────────────────

export type OnboardingStep = 1 | 2;

export interface OnboardingState {
  completed: boolean;
  currentStep: OnboardingStep;
  disclaimerAccepted: boolean;
}

// ─── User Profile (future: Supabase Auth) ──────────────────

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  plan: PlanTier;
  /** TODO: Stripe + Supabase — sync subscription status */
  subscriptionStatus: "active" | "canceled" | "trialing" | "none";
  createdAt: string;
}

export const DEFAULT_USER: UserProfile = {
  id: "demo-user",
  name: "Alex Morgan",
  email: "alex@demo.jubilation.app",
  avatarUrl: null,
  plan: "free",
  subscriptionStatus: "none",
  createdAt: new Date().toISOString(),
};

// ─── App State (Zustand) ───────────────────────────────────

export interface AppState {
  // Meta
  locale: Locale;
  currency: Currency;
  activeNav: NavItemId;
  activeTab: DashboardTab;
  sidebarOpen: boolean;

  // Onboarding
  onboarding: OnboardingState;

  // User — TODO: Supabase Auth
  user: UserProfile;

  // KPIs
  kpis: KPIValues;

  // Portfolio
  portfolio: PortfolioAsset[];
  portfolioSearchQuery: string;

  // Simulation
  projections: ProjectionYear[];
  chartData: ChartDataPoint[];

  // Monte Carlo
  monteCarlo: MonteCarloState;
  activeStressTest: StressTestId | null;
  stressTestResults: StressTestResult[];

  // UI
  isExporting: boolean;
}

// ─── Mock Data — ~$810K lifestyle demo portfolio ───────────

export const MOCK_PORTFOLIO: PortfolioAsset[] = [
  {
    id: "asset-home-primary",
    ticker: "HOME-PRIMARY",
    name: "Primary Residence — São Paulo",
    assetClass: "real_estate",
    quantity: 1,
    currentPrice: 295_000,
    costBasis: 240_000,
    currency: "USD",
    allocation: 0,
    priceSource: "manual",
  },
  {
    id: "asset-home-beach",
    ticker: "HOME-BEACH",
    name: "Beach House — Trancoso",
    assetClass: "real_estate",
    quantity: 1,
    currentPrice: 175_000,
    costBasis: 145_000,
    currency: "USD",
    allocation: 0,
    priceSource: "manual",
  },
  {
    id: "asset-lambo",
    ticker: "LAMBO",
    name: "Lamborghini Huracán",
    assetClass: "personal",
    quantity: 1,
    currentPrice: 72_000,
    costBasis: 95_000,
    currency: "USD",
    allocation: 0,
    priceSource: "manual",
  },
  {
    id: "asset-watch",
    ticker: "WATCH",
    name: "Rolex Daytona",
    assetClass: "personal",
    quantity: 1,
    currentPrice: 18_000,
    costBasis: 12_000,
    currency: "USD",
    allocation: 0,
    priceSource: "manual",
  },
  {
    id: "asset-btc",
    ticker: "BTC",
    name: "Bitcoin",
    assetClass: "crypto",
    quantity: 2.5,
    currentPrice: 67_500,
    costBasis: 41_200,
    currency: "USD",
    allocation: 0,
    priceSource: "coingecko",
  },
  {
    id: "asset-aapl",
    ticker: "AAPL",
    name: "Apple Inc.",
    assetClass: "stocks",
    quantity: 45,
    currentPrice: 198.75,
    costBasis: 145.2,
    currency: "USD",
    allocation: 0,
    priceSource: "yahoo",
  },
  {
    id: "asset-tsla",
    ticker: "TSLA",
    name: "Tesla, Inc.",
    assetClass: "stocks",
    quantity: 22,
    currentPrice: 342.1,
    costBasis: 218.5,
    currency: "USD",
    allocation: 0,
    priceSource: "yahoo",
  },
  {
    id: "asset-googl",
    ticker: "GOOGL",
    name: "Alphabet Inc. Class A",
    assetClass: "stocks",
    quantity: 40,
    currentPrice: 175.34,
    costBasis: 128.4,
    currency: "USD",
    allocation: 0,
    priceSource: "yahoo",
  },
  {
    id: "asset-nvda",
    ticker: "NVDA",
    name: "NVIDIA Corporation",
    assetClass: "stocks",
    quantity: 45,
    currentPrice: 138.25,
    costBasis: 48.6,
    currency: "USD",
    allocation: 0,
    priceSource: "yahoo",
  },
  {
    id: "asset-spy",
    ticker: "SPY",
    name: "SPDR S&P 500 ETF Trust",
    assetClass: "etf",
    quantity: 50,
    currentPrice: 542.18,
    costBasis: 412.5,
    currency: "USD",
    allocation: 0,
    priceSource: "yahoo",
  },
  {
    id: "asset-bnd",
    ticker: "BND",
    name: "Vanguard Total Bond Market ETF",
    assetClass: "bonds",
    quantity: 140,
    currentPrice: 72.35,
    costBasis: 78.1,
    currency: "USD",
    allocation: 0,
    priceSource: "yahoo",
  },
  {
    id: "asset-aapl34",
    ticker: "AAPL34",
    name: "Apple Inc. BDR",
    assetClass: "bdr",
    quantity: 140,
    currentPrice: 42.15,
    costBasis: 31.8,
    currency: "USD",
    allocation: 0,
    priceSource: "manual",
  },
  {
    id: "asset-msft34",
    ticker: "MSFT34",
    name: "Microsoft Corporation BDR",
    assetClass: "bdr",
    quantity: 80,
    currentPrice: 38.2,
    costBasis: 29.5,
    currency: "USD",
    allocation: 0,
    priceSource: "manual",
  },
];

export const MOCK_TICKER_SEARCH: TickerSearchResult[] = [
  {
    ticker: "SPY",
    name: "SPDR S&P 500 ETF Trust",
    assetClass: "etf",
    exchange: "NYSE",
    currentPrice: 542.18,
    currency: "USD",
  },
  {
    ticker: "QQQ",
    name: "Invesco QQQ Trust",
    assetClass: "etf",
    exchange: "NASDAQ",
    currentPrice: 478.92,
    currency: "USD",
  },
  {
    ticker: "GOOGL",
    name: "Alphabet Inc. Class A",
    assetClass: "stocks",
    exchange: "NASDAQ",
    currentPrice: 175.34,
    currency: "USD",
  },
  {
    ticker: "AMZN",
    name: "Amazon.com Inc.",
    assetClass: "stocks",
    exchange: "NASDAQ",
    currentPrice: 198.42,
    currency: "USD",
  },
  {
    ticker: "NVDA",
    name: "NVIDIA Corporation",
    assetClass: "stocks",
    exchange: "NASDAQ",
    currentPrice: 128.5,
    currency: "USD",
  },
  {
    ticker: "TSLA",
    name: "Tesla Inc.",
    assetClass: "stocks",
    exchange: "NASDAQ",
    currentPrice: 248.76,
    currency: "USD",
  },
  {
    ticker: "ETH",
    name: "Ethereum",
    assetClass: "crypto",
    exchange: "Crypto",
    currentPrice: 3_450,
    currency: "USD",
  },
  {
    ticker: "IVVB11",
    name: "iShares S&P 500 BDR",
    assetClass: "etf",
    exchange: "B3",
    currentPrice: 312.45,
    currency: "BRL",
  },
  {
    ticker: "PETR4",
    name: "Petrobras PN",
    assetClass: "stocks",
    exchange: "B3",
    currentPrice: 38.72,
    currency: "BRL",
  },
  {
    ticker: "VALE3",
    name: "Vale S.A.",
    assetClass: "stocks",
    exchange: "B3",
    currentPrice: 62.15,
    currency: "BRL",
  },
  {
    ticker: "IWDA",
    name: "iShares Core MSCI World UCITS ETF",
    assetClass: "etf",
    exchange: "LSE",
    currentPrice: 98.42,
    currency: "EUR",
  },
  {
    ticker: "ASML",
    name: "ASML Holding N.V.",
    assetClass: "stocks",
    exchange: "NASDAQ",
    currentPrice: 892.5,
    currency: "USD",
  },
];

// ─── Helpers ───────────────────────────────────────────────

export const LOCAL_STORAGE_KEY = "jubilation-v2-state";
export const PERSIST_VERSION = 1;

export {
  DEFAULT_TENANT,
  type Tenant,
  type DataRegion,
  type Institution,
  type FinancialAccount,
  type Entitlement,
} from "@/lib/engine/canonical";

export function getCurrencyOption(code: Currency): CurrencyOption {
  return CURRENCIES.find((c) => c.code === code) ?? CURRENCIES[0];
}

function localeForCurrency(currency: Currency): string {
  if (currency === "BRL") return "pt-BR";
  if (currency === "EUR") return "de-DE";
  return "en-US";
}

export function formatCurrencyValue(
  value: number,
  currency: Currency,
  compact = false,
  locale?: string
): string {
  const option = getCurrencyOption(currency);
  return new Intl.NumberFormat(locale ?? localeForCurrency(currency), {
    style: "currency",
    currency: option.code,
    notation: compact ? "compact" : "standard",
    maximumFractionDigits: compact ? 1 : 0,
  }).format(value);
}

export function formatPercentValue(value: number, decimals = 1): string {
  return `${value.toFixed(decimals)}%`;
}

export interface PortfolioValueQuote {
  currency: Currency;
  rates: Record<Currency, number>;
}

export function calculatePortfolioValue(
  assets: PortfolioAsset[],
  quote?: PortfolioValueQuote
): number {
  if (assets.length === 0) return 0;
  const currencies = new Set(
    assets.map((a) => a.nativeCurrency ?? a.currency)
  );
  if (currencies.size === 1) {
    const only = [...currencies][0]!;
    if (!quote || quote.currency === only) {
      return assets.reduce(
        (sum, asset) => sum + asset.quantity * asset.currentPrice,
        0
      );
    }
  }
  if (!quote) {
    throw new Error(
      "Mixed-currency portfolio requires quote currency and FX rates"
    );
  }
  let total = 0;
  for (const asset of assets) {
    const from = asset.nativeCurrency ?? asset.currency;
    const native = asset.quantity * asset.currentPrice;
    if (from === quote.currency) {
      total += native;
      continue;
    }
    const fromRate = quote.rates[from];
    const toRate = quote.rates[quote.currency];
    if (!fromRate || !toRate) {
      throw new Error(`No FX rate for ${from}→${quote.currency}`);
    }
    total += native * (toRate / fromRate);
  }
  return total;
}

/** Base chart points — confidence bands come from Monte Carlo via chartDataWithMcBands */
export function generateChartData(
  projections: ProjectionYear[]
): ChartDataPoint[] {
  return projections.map((p) => ({
    year: p.year,
    age: p.age,
    value: p.portfolioValue,
    band: 0,
    expenses: p.expenses,
    invested: p.invested,
    returns: p.returns,
    requiredIncome: p.requiredIncome,
  }));
}

function formatDistributionBinLabel(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1000) return `${Math.round(value / 1000)}K`;
  return String(Math.round(value));
}

export function buildDistributionBins(
  values: number[],
  target: number | null,
  binCount = 14
): DistributionBin[] {
  if (values.length === 0) return [];

  const sorted = [...values].sort((a, b) => a - b);
  const min = sorted[0];
  const max = sorted[sorted.length - 1];
  const span = max - min || 1;
  const width = span / binCount;

  const bins: DistributionBin[] = [];
  for (let i = 0; i < binCount; i++) {
    const bMin = min + i * width;
    const bMax = i === binCount - 1 ? max + 1 : min + (i + 1) * width;
    const midpoint = (bMin + bMax) / 2;
    const count = values.filter((v) => {
      if (i === binCount - 1) return v >= bMin && v <= max;
      return v >= bMin && v < bMax;
    }).length;

    bins.push({
      label: formatDistributionBinLabel(midpoint),
      min: bMin,
      max: bMax,
      midpoint,
      count,
      meetsTarget: target != null && midpoint >= target,
    });
  }

  return bins;
}

export { runMonteCarloSimulation } from "@/lib/monteCarlo";

export { runStressTest } from "@/lib/stressTest";