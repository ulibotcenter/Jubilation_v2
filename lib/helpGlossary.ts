export interface GlossaryEntry {
  field: string;
  meaning: string;
  usedIn: string;
}

export interface GlossaryGroup {
  id: string;
  title: string;
  description: string;
  entries: GlossaryEntry[];
}

export const HELP_GLOSSARY: GlossaryGroup[] = [
  {
    id: "kpis",
    title: "Dashboard assumptions",
    description: "Inputs that drive your retirement projection and Monte Carlo runs.",
    entries: [
      {
        field: "Current Age",
        meaning: "Your age today. Sets the starting point on the projection timeline.",
        usedIn: "Dashboard · Simulation chart",
      },
      {
        field: "Retirement Age",
        meaning: "The age when you plan to stop working and rely on portfolio income.",
        usedIn: "Dashboard · Simulation chart",
      },
      {
        field: "Current Net Worth",
        meaning:
          "Total value of assets you want included in the plan. Syncs with tracked portfolio holdings plus any amount outside the portfolio.",
        usedIn: "Dashboard · Simulation · Monte Carlo",
      },
      {
        field: "Monthly Contribution",
        meaning: "How much you expect to invest each month until retirement.",
        usedIn: "Dashboard · Simulation chart",
      },
      {
        field: "Suggested income",
        meaning:
          "Monthly income the app estimates at retirement using the 4% rule on your projected portfolio.",
        usedIn: "Dashboard hero",
      },
      {
        field: "Your income goal",
        meaning:
          "The monthly income you want in retirement. Compared against the suggested amount to show gap or surplus.",
        usedIn: "Dashboard hero · KPI cards",
      },
      {
        field: "Desired Retirement Income",
        meaning: "Same as your income goal — editable in KPI cards or the hero panel.",
        usedIn: "Dashboard · Monte Carlo target",
      },
      {
        field: "Expected CAGR",
        meaning:
          "Compound annual growth rate — your expected average yearly return before inflation.",
        usedIn: "Dashboard · Simulation · Monte Carlo",
      },
      {
        field: "Annual Inflation",
        meaning:
          "Estimated yearly rise in living costs. Used to show inflation-adjusted portfolio value.",
        usedIn: "Dashboard · Simulation chart",
      },
    ],
  },
  {
    id: "portfolio",
    title: "Portfolio holdings",
    description: "Columns shown when you track stocks, funds, crypto, and physical assets.",
    entries: [
      {
        field: "Qty",
        meaning: "Number of units you own (shares, coins, or 1 for a home/vehicle).",
        usedIn: "Portfolio table",
      },
      {
        field: "Avg. price",
        meaning: "Your average purchase cost per unit — the basis for gain/loss.",
        usedIn: "Portfolio table",
      },
      {
        field: "Current",
        meaning:
          "Latest market price per unit from Yahoo/CoinGecko, or your manual estimate for physical assets.",
        usedIn: "Portfolio table",
      },
      {
        field: "Market value",
        meaning: "Quantity × current price — total worth of the holding today.",
        usedIn: "Portfolio table · Allocation chart",
      },
      {
        field: "P&L",
        meaning: "Profit or loss in currency: (current − avg. price) × quantity.",
        usedIn: "Portfolio table",
      },
      {
        field: "Return %",
        meaning: "Percentage gain or loss relative to your average cost.",
        usedIn: "Portfolio table",
      },
      {
        field: "Weight",
        meaning: "Share of total portfolio value represented by this holding.",
        usedIn: "Portfolio table · Donut chart",
      },
    ],
  },
  {
    id: "simulation",
    title: "Simulation & stress tests",
    description: "How future wealth is projected and stress-tested.",
    entries: [
      {
        field: "Base case line",
        meaning: "Projection using your CAGR and contributions until retirement age.",
        usedIn: "Simulation chart",
      },
      {
        field: "Pessimistic / Optimistic band",
        meaning:
          "Illustrative range around the base case — not a guarantee of future performance.",
        usedIn: "Simulation chart",
      },
      {
        field: "Asset scope",
        meaning:
          "Choose which holdings feed the chart and Monte Carlo (e.g. investments only, excluding homes or cash).",
        usedIn: "Simulation toolbar",
      },
      {
        field: "Monte Carlo",
        meaning:
          "Runs 1,000 randomized paths to estimate success rate against a portfolio target derived from your income goal (25× annual desired income).",
        usedIn: "Simulation tab",
      },
      {
        field: "FI Target",
        meaning:
          "Portfolio size needed to fund your desired monthly income using the 25× (4%) rule.",
        usedIn: "Dashboard hero",
      },
      {
        field: "Stress tests",
        meaning:
          "One-click scenarios (market crash, stagflation, early retirement) that temporarily shock assumptions.",
        usedIn: "Simulation tab",
      },
      {
        field: "Inflation-adjusted value",
        meaning: "Portfolio value expressed in today's purchasing power.",
        usedIn: "Projection table",
      },
    ],
  },
];