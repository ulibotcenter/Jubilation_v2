import { B3Connector } from "@/lib/connectors/b3";
import { b3BusinessDay } from "@/lib/connectors/b3/quota";
import { canCollect, type Consent } from "@/lib/connectors/consent";
import { reconcileHoldings, type ReconcileResult } from "@/lib/connectors/reconcile";
import type {
  CanonicalFetch,
  ConnectorHealth,
  ConnectorSyncState,
} from "@/lib/connectors/types";
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
  previousSync?: ConnectorSyncState | null;
}

export interface RunB3SyncResult {
  fetch: CanonicalFetch;
  reconcile: ReconcileResult;
  sync: ConnectorSyncState;
  applied: boolean;
}

export function isB3RemoteUnavailable(
  health: Pick<ConnectorHealth, "status"> | null | undefined
): boolean {
  return health?.status === "unavailable";
}

export interface CommitB3SyncInput {
  existing: PortfolioAsset[];
  institutions: Institution[];
  accounts: FinancialAccount[];
  snapshot: {
    holdings: PortfolioAsset[];
    institutions: Institution[];
    accounts: FinancialAccount[];
    health: ConnectorHealth;
    raw: { hash: string };
  };
  previousSync?: ConnectorSyncState | null;
}

/**
 * Apply a B3 snapshot onto the current book. An unavailable remote
 * (live or sandbox) must not reconcile empty incoming over fixture
 * rows or stamp mode=live / lastSuccessAt.
 */
export function commitB3Sync(input: CommitB3SyncInput): {
  reconcile: ReconcileResult;
  sync: ConnectorSyncState;
  applied: boolean;
} {
  const applied = !isB3RemoteUnavailable(input.snapshot.health);
  const previous = input.previousSync;
  const reconcile = applied
    ? reconcileHoldings({
        existing: input.existing,
        incoming: input.snapshot.holdings,
        institutions: input.snapshot.institutions,
        accounts: input.snapshot.accounts,
        existingInstitutions: input.institutions,
        existingAccounts: input.accounts,
      })
    : {
        portfolio: input.existing,
        institutions: input.institutions,
        accounts: input.accounts,
        merges: [],
      };
  const health = input.snapshot.health;
  const queriedAt = health.lastSuccessAt ?? new Date().toISOString();
  return {
    reconcile,
    applied,
    sync: applied
      ? {
          connectorId: "b3",
          lastSuccessAt: health.lastSuccessAt,
          lastError: health.lastError,
          staleness: health.staleness,
          asOf: health.asOf,
          mode: health.mode,
          partial: health.partial,
          rawHash: input.snapshot.raw.hash,
          lastQueryAt: queriedAt,
          queriedBusinessDay: b3BusinessDay(new Date(queriedAt)),
        }
      : {
          connectorId: "b3",
          lastSuccessAt: previous?.lastSuccessAt ?? null,
          lastError: health.lastError,
          staleness: previous?.staleness ?? "unknown",
          asOf: previous?.asOf ?? null,
          mode: previous?.mode ?? "fixture",
          partial: true,
          rawHash: previous?.rawHash ?? null,
          lastQueryAt: queriedAt,
          queriedBusinessDay: b3BusinessDay(new Date(queriedAt)),
        },
  };
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
  const committed = commitB3Sync({
    existing: input.existing,
    institutions: input.institutions,
    accounts: input.accounts,
    snapshot,
    previousSync: input.previousSync,
  });
  return {
    fetch: snapshot,
    reconcile: committed.reconcile,
    sync: committed.sync,
    applied: committed.applied,
  };
}
