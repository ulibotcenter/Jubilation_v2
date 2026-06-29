import type { AssetClass } from "@/types";

/** Tailwind bg classes for UI chips */
export const CLASS_BG: Record<AssetClass, string> = {
  stocks: "bg-accent",
  etf: "bg-blue-500",
  bdr: "bg-cyan-500",
  bonds: "bg-emerald-500",
  funds: "bg-indigo-500",
  commodities: "bg-amber-500",
  reit: "bg-purple-500",
  real_estate: "bg-violet-600",
  personal: "bg-rose-500",
  crypto: "bg-yellow-500",
  cash: "bg-slate-400",
  other: "bg-zinc-500",
};

/** Hex colors for Recharts */
export const CLASS_HEX: Record<AssetClass, string> = {
  stocks: "#ff7040",
  etf: "#3b82f6",
  bdr: "#06b6d4",
  bonds: "#10b981",
  funds: "#6366f1",
  commodities: "#f59e0b",
  reit: "#a855f7",
  real_estate: "#7c3aed",
  personal: "#f43f5e",
  crypto: "#eab308",
  cash: "#94a3b8",
  other: "#71717a",
};