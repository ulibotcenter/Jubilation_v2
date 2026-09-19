import type {
  CanonicalFetch,
  Connector,
  ConnectorCapabilities,
  ConnectorHealth,
  DiscoveredAccount,
} from "@/lib/connectors/types";
import { hashPayload } from "@/lib/connectors/hash";
import type { PortfolioAsset } from "@/types";
import { todayIsoDate } from "@/lib/engine/provenance";

/** Manual entry is a connector, not a parallel path. */
export class ManualEntryConnector implements Connector {
  readonly id = "manual" as const;

  constructor(private readonly holdings: PortfolioAsset[]) {}

  capabilities(): ConnectorCapabilities {
    return {
      kinds: [
        "BROKERAGE",
        "FIXED_INCOME",
        "PENSION_PRIVATE_DC",
        "SEVERANCE_FUND",
        "REAL_ESTATE",
        "VEHICLE",
        "CASH",
      ],
      products: [],
      supportsCashFlows: false,
      supportsDiscover: true,
      live: false,
    };
  }

  health(): ConnectorHealth {
    const asOf = this.holdings[0]?.asOf ?? null;
    return {
      status: "ok",
      lastSuccessAt: asOf,
      lastError: null,
      staleness: "unknown",
      asOf,
      partial: false,
      mode: "manual",
    };
  }

  async discover(): Promise<DiscoveredAccount[]> {
    return [];
  }

  async fetchPositions(): Promise<CanonicalFetch> {
    const asOf = todayIsoDate();
    const holdings = this.holdings.filter((h) => h.source === "MANUAL");
    const health = this.health();
    return {
      institutions: [],
      accounts: [],
      holdings,
      cashFlows: [],
      health,
      raw: {
        asOf,
        receivedAt: new Date().toISOString(),
        hash: hashPayload(holdings.map((h) => h.id)),
        payload: { ids: holdings.map((h) => h.id) },
        partial: false,
        errors: [],
        mode: "manual",
      },
    };
  }

  async fetchCashFlows(): Promise<CanonicalFetch> {
    return this.fetchPositions();
  }
}
