import { createId } from "@/lib/engine/ids";

export type ConsentStatus =
  | "AWAITING_AUTHORISATION"
  | "AUTHORISED"
  | "REJECTED"
  | "EXPIRED"
  | "REVOKED"
  | "PENDING_PURGE";

export type ConsentProvider = "b3";

export type RevocationChannel = "app" | "provider" | "support";

export interface ConsentEvidence {
  version: string;
  shownText: string;
  locale: string;
}

export interface ConsentRenewal {
  grantedAt: string;
  expiresAt: string | null;
}

export interface Consent {
  id: string;
  subjectId: string;
  provider: ConsentProvider;
  integratorId: string;
  partnerId: string;
  institutionId: string;
  scopes: string[];
  purpose: string;
  status: ConsentStatus;
  grantedAt: string | null;
  expiresAt: string | null;
  externalConsentId: string | null;
  renewalHistory: ConsentRenewal[];
  revokedAt: string | null;
  revocationChannel: RevocationChannel | null;
  purgeAfter: string | null;
  evidence: ConsentEvidence;
}

export interface ConsentAuditEntry {
  id: string;
  at: string;
  actor: string;
  action: "grant" | "revoke" | "sync" | "export" | "deny-sync";
  consentId: string;
  detail: string;
}

export const B3_CONSENT_SCOPES = [
  "position:equities",
  "position:treasury",
  "position:fixed_income",
  "movement:read",
  "events:read",
] as const;

export const B3_CONSENT_PURPOSE =
  "Consolidar posição e rentabilidade da carteira em custódia B3 no plano de aposentadoria. Não inclui recomendação de ticker.";

export const B3_CONSENT_EVIDENCE_VERSION = "b3-position-v1";

export const B3_CONSENT_EVIDENCE_PT = `Você autoriza o Jubilation a consultar sua posição na B3 (custódia D-1: ações, Tesouro Direto e renda fixa registrada) para consolidar a carteira no plano. Não recomendamos tickers (Res. CVM 19). A B3 é licença comercial da Área Logada do Investidor, não Open Finance. Sem credencial de sandbox, este lote carrega uma fixture. Já importado permanece no plano se você revogar; paramos de coletar dado novo. Revogação é imediata para coleta; a exclusão física espera 48 horas (revogação reversível).`;

export const PURGE_GRACE_MS = 48 * 60 * 60 * 1000;

export const B3_INTEGRATOR_ID = "jubilation";
export const B3_INSTITUTION_ID = "inst-b3";

export function grantB3Consent(input: {
  subjectId: string;
  partnerId: string;
  locale?: string;
  now?: Date;
}): { consent: Consent; audit: ConsentAuditEntry } {
  const now = (input.now ?? new Date()).toISOString();
  const consent: Consent = {
    id: createId("consent"),
    subjectId: input.subjectId,
    provider: "b3",
    integratorId: B3_INTEGRATOR_ID,
    partnerId: input.partnerId,
    institutionId: B3_INSTITUTION_ID,
    scopes: [...B3_CONSENT_SCOPES],
    purpose: B3_CONSENT_PURPOSE,
    status: "AUTHORISED",
    grantedAt: now,
    expiresAt: null,
    externalConsentId: null,
    renewalHistory: [],
    revokedAt: null,
    revocationChannel: null,
    purgeAfter: null,
    evidence: {
      version: B3_CONSENT_EVIDENCE_VERSION,
      shownText: B3_CONSENT_EVIDENCE_PT,
      locale: input.locale ?? "pt",
    },
  };
  return {
    consent,
    audit: auditEntry({
      at: now,
      actor: input.subjectId,
      action: "grant",
      consentId: consent.id,
      detail: `scopes=${consent.scopes.join(",")}`,
    }),
  };
}

export function revokeConsent(
  consent: Consent,
  input: {
    actor: string;
    channel?: RevocationChannel;
    now?: Date;
  }
): { consent: Consent; audit: ConsentAuditEntry } {
  const nowDate = input.now ?? new Date();
  const now = nowDate.toISOString();
  const next: Consent = {
    ...consent,
    status: "PENDING_PURGE",
    revokedAt: now,
    revocationChannel: input.channel ?? "app",
    purgeAfter: new Date(nowDate.getTime() + PURGE_GRACE_MS).toISOString(),
  };
  return {
    consent: next,
    audit: auditEntry({
      at: now,
      actor: input.actor,
      action: "revoke",
      consentId: consent.id,
      detail: `channel=${next.revocationChannel};purgeAfter=${next.purgeAfter}`,
    }),
  };
}

export function canCollect(consent: Consent | null | undefined, now = new Date()): boolean {
  if (!consent) return false;
  if (consent.status !== "AUTHORISED") return false;
  if (consent.revokedAt) return false;
  if (consent.expiresAt && Date.parse(consent.expiresAt) <= now.getTime()) {
    return false;
  }
  return true;
}

export function exportConsents(consents: Consent[]): string {
  return JSON.stringify(
    {
      exportedAt: new Date().toISOString(),
      format: "jubilation-consent-v1",
      consents,
    },
    null,
    2
  );
}

export function auditEntry(input: Omit<ConsentAuditEntry, "id">): ConsentAuditEntry {
  return { id: createId("audit"), ...input };
}

export function appendAudit(
  log: ConsentAuditEntry[],
  entry: ConsentAuditEntry
): ConsentAuditEntry[] {
  return [...log, entry];
}
