export type { Connector, ConnectorId, ConnectorSyncState, CanonicalFetch } from "@/lib/connectors/types";
export { stalenessOf } from "@/lib/connectors/types";
export {
  grantB3Consent,
  grantCnisConsent,
  grantIrpfConsent,
  revokeConsent,
  canCollect,
  exportConsents,
  appendAudit,
  auditEntry,
  B3_CONSENT_EVIDENCE_PT,
  CNIS_CONSENT_EVIDENCE_PT,
  IRPF_CONSENT_EVIDENCE_PT,
  B3_CONSENT_SCOPES,
  type Consent,
  type ConsentAuditEntry,
} from "@/lib/connectors/consent";
export { reconcileHoldings, matchImported } from "@/lib/connectors/reconcile";
export { isOutsideB3Coverage } from "@/lib/connectors/coverage";
export { isConnectorEnabled, isOpenFinanceEnabled, hasB3SandboxCredentials } from "@/lib/connectors/flags";
export { runB3Sync, ConsentRequiredError } from "@/lib/connectors/sync";
export { B3Connector, createB3Connector, fixtureCanonical } from "@/lib/connectors/b3";
export { ManualEntryConnector } from "@/lib/connectors/manual";
export { allowlistB3Payload } from "@/lib/connectors/b3/allowlist";
export { mapAllowlistedB3 } from "@/lib/connectors/b3/map";
export { B3_FIXTURE_RAW, B3_FIXTURE_AS_OF } from "@/lib/connectors/b3/fixture";
export { parseCnisFile, mapCnisToInssPerson } from "@/lib/connectors/cnis";
export { parseIrpfFile, suggestIrpfHoldings, applyIrpfHoldings } from "@/lib/connectors/irpf";
