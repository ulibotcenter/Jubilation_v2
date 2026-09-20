import { createId } from "@/lib/engine/ids";

export type ConsentStatus =
  | "AWAITING_AUTHORISATION"
  | "AUTHORISED"
  | "REJECTED"
  | "EXPIRED"
  | "REVOKED"
  | "PENDING_PURGE";

export type ConsentProvider = "b3" | "cnis" | "irpf";

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

export const B3_CONSENT_EVIDENCE_VERSION = "b3-position-v2";

export const B3_CONSENT_EVIDENCE_PT = `Você autoriza o Jubilation a consultar sua posição na B3 (custódia D-1: ações, Tesouro Direto e renda fixa registrada) para consolidar a carteira no plano. Não recomendamos tickers (Res. CVM 19). A B3 é licença comercial da Nova Área Logada do Investidor (PJ não financeira), não Open Finance. Sem credencial de produção (B3_PRODUCTION_*) o app fica na fixture e diz isso — não é a sua custódia. Já importado permanece no plano se você revogar; paramos de coletar dado novo. Revogação é imediata para coleta; a exclusão física espera 48 horas (revogação reversível).`;

export const PURGE_GRACE_MS = 48 * 60 * 60 * 1000;

export const B3_INTEGRATOR_ID = "jubilation";
export const B3_INSTITUTION_ID = "inst-b3";

export const CNIS_CONSENT_SCOPES = ["cnis:extract"] as const;
export const CNIS_CONSENT_PURPOSE =
  "Ler o extrato do CNIS que você baixou no Meu INSS para calcular tempo de contribuição e salário de benefício. Sem senha gov.br, sem raspar portal.";
export const CNIS_CONSENT_EVIDENCE_VERSION = "cnis-file-v1";
export const CNIS_CONSENT_EVIDENCE_PT = `Você envia o arquivo que o titular exportou no Meu INSS (PDF, texto ou CSV). O processamento é local neste aparelho: o arquivo não é enviado a servidor nem logado. Indicadores de saúde (incapacidade, invalidez, auxílio-doença) são descartados na ingestão. PREC-MENOR, PEXT, PVINC, concomitância e tempo rural/especial entram como campos nomeados. Já importado permanece no plano se você revogar; paramos de ler arquivo novo. Revogação é imediata para coleta; a exclusão física espera 48 horas.`;

export const IRPF_CONSENT_SCOPES = ["irpf:dbk"] as const;
export const IRPF_CONSENT_PURPOSE =
  "Ler o backup .DBK/.DEC da declaração do IRPF que você exportou do programa da Receita, com allowlist de campos.";
export const IRPF_CONSENT_EVIDENCE_VERSION = "irpf-file-v1";
export const IRPF_CONSENT_EVIDENCE_PT = `Você envia o .DBK (cópia de segurança do programa gerador) ou o .DEC. O leiaute é o publicado pela Receita (registros de largura fixa). O registro 26 (pagamentos a médicos/clínicas) é descartado antes de qualquer persistência ou log. Rendimentos, bens e previdência privada podem entrar no plano; posições da B3 não são sobrescritas. O arquivo não sai deste aparelho. Sem senha gov.br e sem e-CAC. Revogação para a coleta na hora; exclusão física em 48 horas.`;

export const FILE_CONSENT_EVIDENCE: Record<
  "cnis" | "irpf",
  { version: string; shownText: string; purpose: string; scopes: readonly string[]; institutionId: string }
> = {
  cnis: {
    version: CNIS_CONSENT_EVIDENCE_VERSION,
    shownText: CNIS_CONSENT_EVIDENCE_PT,
    purpose: CNIS_CONSENT_PURPOSE,
    scopes: CNIS_CONSENT_SCOPES,
    institutionId: "inst-inss",
  },
  irpf: {
    version: IRPF_CONSENT_EVIDENCE_VERSION,
    shownText: IRPF_CONSENT_EVIDENCE_PT,
    purpose: IRPF_CONSENT_PURPOSE,
    scopes: IRPF_CONSENT_SCOPES,
    institutionId: "inst-rfb",
  },
};

function grantFileConsent(
  provider: "cnis" | "irpf",
  input: { subjectId: string; partnerId: string; locale?: string; now?: Date }
): { consent: Consent; audit: ConsentAuditEntry } {
  const now = (input.now ?? new Date()).toISOString();
  const spec = FILE_CONSENT_EVIDENCE[provider];
  const consent: Consent = {
    id: createId("consent"),
    subjectId: input.subjectId,
    provider,
    integratorId: B3_INTEGRATOR_ID,
    partnerId: input.partnerId,
    institutionId: spec.institutionId,
    scopes: [...spec.scopes],
    purpose: spec.purpose,
    status: "AUTHORISED",
    grantedAt: now,
    expiresAt: null,
    externalConsentId: null,
    renewalHistory: [],
    revokedAt: null,
    revocationChannel: null,
    purgeAfter: null,
    evidence: {
      version: spec.version,
      shownText: spec.shownText,
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

export function grantCnisConsent(input: {
  subjectId: string;
  partnerId: string;
  locale?: string;
  now?: Date;
}): { consent: Consent; audit: ConsentAuditEntry } {
  return grantFileConsent("cnis", input);
}

export function grantIrpfConsent(input: {
  subjectId: string;
  partnerId: string;
  locale?: string;
  now?: Date;
}): { consent: Consent; audit: ConsentAuditEntry } {
  return grantFileConsent("irpf", input);
}

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
