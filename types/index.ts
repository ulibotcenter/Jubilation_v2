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

// ─── Subscription Plans (future: Stripe + Supabase) ──────────

/** Plan tier — placeholder for beta; billing not active yet */
export type PlanTier = "free" | "monthly" | "yearly";

export interface SubscriptionPlan {
  id: PlanTier;
  name: string;
  price: number;
  currency: Currency;
  interval: "month" | "year" | null;
  features: string[];
  /** Stripe Price ID — TODO: Stripe + Supabase */
  stripePriceId: string | null;
}

export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: "free",
    name: "Free",
    price: 0,
    currency: "USD",
    interval: null,
    features: [
      "Basic retirement projection",
      "Up to 10 portfolio assets",
      "Monte Carlo simulation",
    ],
    stripePriceId: null,
  },
  {
    id: "monthly",
    name: "Pro Monthly",
    price: 9.99,
    currency: "USD",
    interval: "month",
    features: [
      "Unlimited assets",
      "Advanced stress tests",
      "Export reports (PDF/CSV)",
      "Priority support",
    ],
    stripePriceId: null, // TODO: Stripe + Supabase
  },
  {
    id: "yearly",
    name: "Pro Yearly",
    price: 89.99,
    currency: "USD",
    interval: "year",
    features: [
      "Everything in Pro Monthly",
      "25% savings vs monthly",
      "Early access to new features",
    ],
    stripePriceId: null, // TODO: Stripe + Supabase
  },
];

// ─── Navigation ────────────────────────────────────────────

export type NavItemId =
  | "dashboard"
  | "portfolio"
  | "simulation"
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
  | "currentNetWorth"
  | "monthlyContribution"
  | "desiredMonthlyIncome"
  | "expectedCAGR"
  | "annualInflation";

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
  },
  {
    field: "retirementAge",
    label: "Retirement Age",
    min: 40,
    max: 90,
    step: 1,
    decimals: 0,
    format: "integer",
  },
  {
    field: "currentNetWorth",
    label: "Current Net Worth",
    min: 0,
    max: 100_000_000,
    step: 1000,
    decimals: 0,
    format: "currency",
  },
  {
    field: "monthlyContribution",
    label: "Monthly Contribution",
    min: 0,
    max: 500_000,
    step: 100,
    decimals: 0,
    format: "currency",
  },
  {
    field: "desiredMonthlyIncome",
    label: "Desired Retirement Income",
    min: 0,
    max: 500_000,
    step: 100,
    decimals: 0,
    format: "currency",
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
    fields: ["currentAge", "retirementAge"],
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
  currentNetWorth: number;
  monthlyContribution: number;
  /** User's target monthly income at retirement */
  desiredMonthlyIncome: number;
  expectedCAGR: number;
  annualInflation: number;
}

export const DEFAULT_KPI_VALUES: KPIValues = {
  currentAge: 35,
  retirementAge: 65,
  currentNetWorth: 250_000,
  monthlyContribution: 2_500,
  desiredMonthlyIncome: 8_500,
  expectedCAGR: 8.5,
  annualInflation: 3.0,
};

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

export interface PortfolioAsset {
  id: string;
  ticker: string;
  name: string;
  assetClass: AssetClass;
  quantity: number;
  currentPrice: number;
  costBasis: number;
  currency: Currency;
  /** Allocation weight 0–100 */
  allocation: number;
  priceSource?: PriceSource;
  lastPriceAt?: string | null;
  previousPrice?: number | null;
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
  portfolioValue: number;
  contributions: number;
  returns: number;
  inflationAdjusted: number;
}

export interface ChartDataPoint {
  year: number;
  age: number;
  value: number;
  pessimistic?: number;
  optimistic?: number;
  /** Stacked band height: optimistic − pessimistic */
  band?: number;
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
  target: number;
}

export interface MonteCarloState {
  hasRun: boolean;
  isRunning: boolean;
  lastRunAt: string | null;
  results: MonteCarloResult[];
  distributions: Record<MonteCarloScenario, DistributionBin[]> | null;
  target: number | null;
  iterations: number;
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

// ─── Mock Data — Rich portfolio for beta demo ──────────────

export const MOCK_PORTFOLIO: PortfolioAsset[] = [
  {
    id: "asset-1",
    ticker: "VTI",
    name: "Vanguard Total Stock Market ETF",
    assetClass: "etf",
    quantity: 450,
    currentPrice: 285.42,
    costBasis: 198.5,
    currency: "USD",
    allocation: 28,
  },
  {
    id: "asset-2",
    ticker: "VXUS",
    name: "Vanguard Total International Stock ETF",
    assetClass: "etf",
    quantity: 320,
    currentPrice: 62.18,
    costBasis: 54.2,
    currency: "USD",
    allocation: 12,
  },
  {
    id: "asset-3",
    ticker: "BND",
    name: "Vanguard Total Bond Market ETF",
    assetClass: "bonds",
    quantity: 800,
    currentPrice: 72.35,
    costBasis: 78.1,
    currency: "USD",
    allocation: 15,
  },
  {
    id: "asset-4",
    ticker: "AAPL",
    name: "Apple Inc.",
    assetClass: "stocks",
    quantity: 120,
    currentPrice: 198.75,
    costBasis: 145.2,
    currency: "USD",
    allocation: 10,
  },
  {
    id: "asset-5",
    ticker: "MSFT",
    name: "Microsoft Corporation",
    assetClass: "stocks",
    quantity: 85,
    currentPrice: 425.6,
    costBasis: 310.0,
    currency: "USD",
    allocation: 12,
  },
  {
    id: "asset-6",
    ticker: "VNQ",
    name: "Vanguard Real Estate ETF",
    assetClass: "reit",
    quantity: 200,
    currentPrice: 88.9,
    costBasis: 92.4,
    currency: "USD",
    allocation: 8,
  },
  {
    id: "asset-7",
    ticker: "BTC",
    name: "Bitcoin",
    assetClass: "crypto",
    quantity: 0.85,
    currentPrice: 67_500,
    costBasis: 28_000,
    currency: "USD",
    allocation: 7,
  },
  {
    id: "asset-8",
    ticker: "CASH",
    name: "High-Yield Savings",
    assetClass: "cash",
    quantity: 1,
    currentPrice: 18_500,
    costBasis: 18_500,
    currency: "USD",
    allocation: 8,
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

export function getCurrencyOption(code: Currency): CurrencyOption {
  return CURRENCIES.find((c) => c.code === code) ?? CURRENCIES[0];
}

export function formatCurrencyValue(
  value: number,
  currency: Currency,
  compact = false
): string {
  const option = getCurrencyOption(currency);
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: option.code,
    notation: compact ? "compact" : "standard",
    maximumFractionDigits: compact ? 1 : 0,
  }).format(value);
}

export function formatPercentValue(value: number, decimals = 1): string {
  return `${value.toFixed(decimals)}%`;
}

export function calculatePortfolioValue(assets: PortfolioAsset[]): number {
  return assets.reduce(
    (sum, asset) => sum + asset.quantity * asset.currentPrice,
    0
  );
}

export function generateProjections(kpis: KPIValues): ProjectionYear[] {
  const projections: ProjectionYear[] = [];
  const yearsToRetirement = kpis.retirementAge - kpis.currentAge;
  let portfolioValue = kpis.currentNetWorth;
  const annualContribution = kpis.monthlyContribution * 12;
  const realReturn =
    (kpis.expectedCAGR - kpis.annualInflation) / 100;

  for (let i = 0; i <= yearsToRetirement; i++) {
    const year = new Date().getFullYear() + i;
    const age = kpis.currentAge + i;
    const returns = i === 0 ? 0 : portfolioValue * realReturn;
    const contributions = i === 0 ? 0 : annualContribution;

    if (i > 0) {
      portfolioValue = portfolioValue + returns + contributions;
    }

    const inflationFactor = Math.pow(
      1 + kpis.annualInflation / 100,
      i
    );

    projections.push({
      year,
      age,
      portfolioValue: Math.round(portfolioValue),
      contributions: Math.round(contributions),
      returns: Math.round(returns),
      inflationAdjusted: Math.round(portfolioValue / inflationFactor),
    });
  }

  return projections;
}

export function generateChartData(
  projections: ProjectionYear[]
): ChartDataPoint[] {
  return projections.map((p) => {
    const pessimistic = Math.round(p.portfolioValue * 0.72);
    const optimistic = Math.round(p.portfolioValue * 1.35);
    return {
      year: p.year,
      age: p.age,
      value: p.portfolioValue,
      pessimistic,
      optimistic,
      band: optimistic - pessimistic,
    };
  });
}

function formatDistributionBinLabel(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1000) return `${Math.round(value / 1000)}K`;
  return String(Math.round(value));
}

export function buildDistributionBins(
  values: number[],
  target: number,
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
      meetsTarget: midpoint >= target,
    });
  }

  return bins;
}

function simulateScenarioFinalValues(
  kpis: KPIValues,
  scenario: MonteCarloScenario,
  iterations: number
): number[] {
  const years = kpis.retirementAge - kpis.currentAge;
  const config = MONTE_CARLO_SCENARIO_MULTIPLIERS[scenario];
  const effectiveCAGR = (kpis.expectedCAGR + config.cagrOffset) / 100;
  const annualContribution = kpis.monthlyContribution * 12;
  const finalValues: number[] = [];

  for (let i = 0; i < iterations; i++) {
    let value = kpis.currentNetWorth;
    for (let y = 0; y < years; y++) {
      const randomReturn =
        effectiveCAGR + (Math.random() - 0.5) * config.volatility;
      value = value * (1 + randomReturn) + annualContribution;
    }
    finalValues.push(value);
  }

  return finalValues;
}

export function runMonteCarloSimulation(
  kpis: KPIValues,
  iterations = 1000
): MonteCarloSimulationOutput {
  const target =
    kpis.desiredMonthlyIncome > 0
      ? kpis.desiredMonthlyIncome * 12 * 25
      : kpis.currentNetWorth * 25;
  const scenarios: MonteCarloScenario[] = [
    "pessimistic",
    "base",
    "optimistic",
  ];

  const results: MonteCarloResult[] = [];
  const distributions = {} as Record<MonteCarloScenario, DistributionBin[]>;

  for (const scenario of scenarios) {
    const finalValues = simulateScenarioFinalValues(kpis, scenario, iterations);
    finalValues.sort((a, b) => a - b);

    const median = finalValues[Math.floor(iterations / 2)];
    const p10 = finalValues[Math.floor(iterations * 0.1)];
    const p90 = finalValues[Math.floor(iterations * 0.9)];
    const successCount = finalValues.filter((v) => v >= target).length;

    results.push({
      scenario,
      label: MONTE_CARLO_SCENARIO_LABELS[scenario],
      finalValue: Math.round(finalValues[finalValues.length - 1]),
      medianValue: Math.round(median),
      successRate: Math.round((successCount / iterations) * 100),
      percentile10: Math.round(p10),
      percentile90: Math.round(p90),
    });

    distributions[scenario] = buildDistributionBins(finalValues, target);
  }

  return { results, distributions, target };
}

export function runStressTest(
  testId: StressTestId,
  kpis: KPIValues,
  projections: ProjectionYear[]
): StressTestResult {
  const test = STRESS_TESTS.find((t) => t.id === testId)!;
  const finalProjection = projections[projections.length - 1];
  const originalValue = finalProjection?.portfolioValue ?? 0;

  const adjustedKpis: KPIValues = {
    ...kpis,
    expectedCAGR: kpis.expectedCAGR + test.cagrImpact,
    annualInflation: kpis.annualInflation + test.inflationImpact,
    retirementAge:
      testId === "early-retirement"
        ? kpis.retirementAge - 5
        : kpis.retirementAge,
    currentNetWorth:
      test.drawdown > 0
        ? kpis.currentNetWorth * (1 - test.drawdown / 100)
        : kpis.currentNetWorth,
    monthlyContribution:
      testId === "early-retirement"
        ? kpis.monthlyContribution * 0.5
        : kpis.monthlyContribution,
  };

  const stressedProjections = generateProjections(adjustedKpis);
  const stressedValue =
    stressedProjections[stressedProjections.length - 1]?.portfolioValue ?? 0;
  const target = kpis.currentNetWorth * 25;

  return {
    testId,
    originalValue,
    stressedValue,
    shortfall: Math.max(0, target - stressedValue),
    stillOnTrack: stressedValue >= target * 0.8,
  };
}