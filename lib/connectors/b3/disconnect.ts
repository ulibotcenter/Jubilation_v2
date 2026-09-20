import { originOf } from "@/lib/holdings/origin";
import type { CashFlow } from "@/lib/engine/canonical";
import type { PortfolioAsset } from "@/types";

/** App disconnect drops B3 rows. Manual and IRPF stay. Official revoke is on B3. */
export function isB3Holding(asset: PortfolioAsset): boolean {
  return originOf(asset) === "b3" || asset.source === "B3_API";
}

export function dropB3Holdings(portfolio: PortfolioAsset[]): PortfolioAsset[] {
  return portfolio.filter((asset) => !isB3Holding(asset));
}

export function dropB3CashFlows(flows: CashFlow[]): CashFlow[] {
  return flows.filter((row) => row.source !== "B3_API");
}
