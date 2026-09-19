import { B3Connector } from "@/lib/connectors/b3";
import { canCollect, type Consent } from "@/lib/connectors/consent";
import { reconcileHoldings, type ReconcileResult } from "@/lib/connectors/reconcile";
import type { CanonicalFetch, ConnectorSyncState } from "@/lib/connectors/types";
import type { FinancialAccount, Institution } from "@/lib/engine/canonical";
import type { PortfolioAsset } from "@/types";

export class ConsentRequiredError extends Error {
  constructor() {
    super("B3 sync requires an authorised consent");
    this.name = "ConsentRequiredError";
  }
}

export interface RunB3SyncInput {
  consent: Consent | null;
  existing: PortfolioAsset[];
  institutions: Institution[];
  accounts: FinancialAccount[];
  connector?: B3Connector;
  now?: Date;
  aborted?: () => boolean;
}

export interface RunB3SyncResult {
  fetch: CanonicalFetch;
  reconcile: ReconcileResult;
  sync: ConnectorSyncState;
}

export async function runB3Sync(input: RunB3SyncInput): Promise<RunB3SyncResult> {
  if (!canCollect(input.consent, input.now)) {
    throw new ConsentRequiredError();
  }
  if (input.aborted?.()) {
    throw new ConsentRequiredError();
  }
  const connector = input.connector ?? new B3Connector();
  const snapshot = await connector.fetchPositions();
  if (input.aborted?.()) {
    throw new ConsentRequiredError();
  }
  const reconcile = reconcileHoldings({
    existing: input.existing,
    incoming: snapshot.holdings,
    institutions: snapshot.institutions,
    accounts: snapshot.accounts,
    existingInstitutions: input.institutions,
    existingAccounts: input.accounts,
  });
  return {
    fetch: snapshot,
    reconcile,
    sync: {
      connectorId: "b3",
      lastSuccessAt: snapshot.health.lastSuccessAt,
      lastError: snapshot.health.lastError,
      staleness: snapshot.health.staleness,
      asOf: snapshot.health.asOf,
      mode: snapshot.health.mode,
      partial: snapshot.health.partial,
      rawHash: snapshot.raw.hash,
    },
  };
}
