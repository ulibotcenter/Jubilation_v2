import type { CanonicalFetch, Connector, ConnectorCapabilities, ConnectorHealth, DiscoveredAccount } from "@/lib/connectors/types";
import { fetchB3Canonical, fixtureCanonical } from "@/lib/connectors/b3/client";
import { hasB3SandboxCredentials } from "@/lib/connectors/flags";

export class B3Connector implements Connector {
  readonly id = "b3" as const;
  private last: CanonicalFetch | null = null;

  constructor(private readonly env: Record<string, string | undefined> = process.env) {}

  capabilities(): ConnectorCapabilities {
    return {
      kinds: ["BROKERAGE", "FIXED_INCOME"],
      products: ["equities", "treasury", "fixed_income", "events"],
      supportsCashFlows: true,
      supportsDiscover: true,
      live: hasB3SandboxCredentials(this.env),
    };
  }

  health(): ConnectorHealth {
    if (this.last) return this.last.health;
    return {
      status: "ok",
      lastSuccessAt: null,
      lastError: null,
      staleness: "unknown",
      asOf: null,
      partial: false,
      mode: hasB3SandboxCredentials(this.env) ? "sandbox" : "fixture",
    };
  }

  async discover(): Promise<DiscoveredAccount[]> {
    const snapshot = await this.fetchPositions();
    return snapshot.accounts.map((account) => ({
      externalRef: account.id,
      name: account.name,
      kind: account.kind,
      institution:
        snapshot.institutions.find((i) => i.id === account.institutionId) ?? {
          id: account.institutionId ?? "unknown",
          name: account.name,
          cnpj: null,
          organisationId: null,
        },
      currency: "BRL",
    }));
  }

  async fetchPositions(since?: string): Promise<CanonicalFetch> {
    this.last = await fetchB3Canonical({ env: this.env, since });
    return this.last;
  }

  async fetchCashFlows(since?: string): Promise<CanonicalFetch> {
    return this.fetchPositions(since);
  }
}

export function createB3Connector(
  env: Record<string, string | undefined> = process.env
): B3Connector {
  return new B3Connector(env);
}

export { fixtureCanonical };
