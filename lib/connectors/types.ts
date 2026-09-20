import type {
  AccountKind,
  CashFlow,
  FinancialAccount,
  Institution,
} from "@/lib/engine/canonical";
import type { PortfolioAsset } from "@/types";

export type ConnectorId = "manual" | "b3" | "cnis" | "irpf";

export type ConnectorMode = "fixture" | "sandbox" | "live" | "manual" | "file";

export type Staleness = "fresh" | "stale" | "unknown";

export interface ConnectorCapabilities {
  kinds: AccountKind[];
  products: ("equities" | "treasury" | "fixed_income" | "events")[];
  supportsCashFlows: boolean;
  supportsDiscover: boolean;
  live: boolean;
}

export interface ConnectorHealth {
  status: "ok" | "degraded" | "unavailable";
  lastSuccessAt: string | null;
  lastError: string | null;
  staleness: Staleness;
  asOf: string | null;
  partial: boolean;
  mode: ConnectorMode;
}

export interface DiscoveredAccount {
  externalRef: string;
  name: string;
  kind: AccountKind;
  institution: Institution;
  currency: "BRL";
}

export interface RawFetchResult {
  asOf: string;
  receivedAt: string;
  hash: string;
  payload: unknown;
  partial: boolean;
  errors: string[];
  mode: ConnectorMode;
}

export interface CanonicalFetch {
  institutions: Institution[];
  accounts: FinancialAccount[];
  holdings: PortfolioAsset[];
  cashFlows: CashFlow[];
  health: ConnectorHealth;
  raw: RawFetchResult;
}

export interface Connector {
  id: ConnectorId;
  discover(): Promise<DiscoveredAccount[]>;
  fetchPositions(since?: string): Promise<CanonicalFetch>;
  fetchCashFlows(since?: string): Promise<CanonicalFetch>;
  capabilities(): ConnectorCapabilities;
  health(): ConnectorHealth;
}

export interface ConnectorSyncState {
  connectorId: ConnectorId;
  lastSuccessAt: string | null;
  lastError: string | null;
  staleness: Staleness;
  asOf: string | null;
  mode: ConnectorMode;
  partial: boolean;
  rawHash: string | null;
}

export const B3_STALE_AFTER_MS = 2 * 24 * 60 * 60 * 1000;

export function stalenessOf(asOf: string | null, now = new Date()): Staleness {
  if (!asOf) return "unknown";
  const then = Date.parse(asOf);
  if (!Number.isFinite(then)) return "unknown";
  return now.getTime() - then > B3_STALE_AFTER_MS ? "stale" : "fresh";
}
