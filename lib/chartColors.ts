/** Semantic chart palette — cash flow uses distinct hues (no orange overload) */

export const CASH_FLOW_COLORS = {
  /** Existing wealth at period start */
  openingWealth: "#6366f1",
  /** New contributions */
  contributions: "#34d399",
  /** CAGR / investment returns */
  returns: "#38bdf8",
  /** Living cost or withdrawals */
  outflows: "#f43f5e",
  /** Projected balance line — violet, separate from brand orange */
  balanceLine: "#a78bfa",
  balanceLineActive: "#c4b5fd",
  /** Retirement phase divider */
  retirementMarker: "#fbbf24",
  /** Neutral subtotal in tooltip */
  buildTotal: "#94a3b8",
  cursor: "rgba(167, 139, 250, 0.1)",
} as const;

export const PROJECTION_COLORS = {
  base: "#ff7040",
  baseFill: "rgba(255, 112, 64, 0.28)",
  pessimistic: "#f87171",
  optimistic: "#4ade80",
  confidenceMid: "rgba(255, 112, 64, 0.08)",
  currentAgeMarker: "#64748b",
  retirementMarker: "#fbbf24",
  grid: "rgba(30, 41, 59, 0.8)",
  cursor: "rgba(255, 112, 64, 0.35)",
} as const;