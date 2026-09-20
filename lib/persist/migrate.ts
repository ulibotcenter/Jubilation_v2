import type { PlanTier } from "@/lib/plans";
import { normalizePortfolioAssets } from "@/lib/engine/liquidity";
import { normalizePortfolioCagr } from "@/lib/portfolioCagr";
import { normalizeTenant, type Tenant } from "@/lib/region";
import { isHousehold } from "@/lib/engine/household";
import { PERSIST_VERSION, normalizeKpiValues, type PortfolioAsset } from "@/types";

export const CURRENT_PERSIST_VERSION = PERSIST_VERSION;

interface LooseState {
  planTier?: string;
  user?: { plan?: string };
  portfolio?: PortfolioAsset[];
  kpis?: unknown;
  demoSeedVersion?: number;
  tenant?: Tenant;
  institutions?: unknown;
  accounts?: unknown;
  entitlements?: unknown;
  consents?: unknown;
  consentAuditLog?: unknown;
  connectorSync?: unknown;
  [key: string]: unknown;
}

function unifyPlanTier(value: unknown): PlanTier {
  if (value === "premium" || value === "horizon" || value === "free") {
    return value;
  }
  if (value === "monthly") return "premium";
  if (value === "yearly") return "horizon";
  return "free";
}

/**
 * Schema migrate for zustand persist.
 * Version 0 (unversioned pre-renew state) → 1:
 * keep the user's portfolio and KPIs (never replace with demo seed).
 */
export function migratePersistedState(
  persisted: unknown,
  fromVersion: number
): Record<string, unknown> {
  const raw = (persisted ?? {}) as LooseState;
  const planTier = unifyPlanTier(raw.planTier ?? raw.user?.plan);

  const portfolio = Array.isArray(raw.portfolio)
    ? normalizePortfolioCagr(normalizePortfolioAssets(raw.portfolio))
    : undefined;

  const kpis = raw.kpis ? normalizeKpiValues(raw.kpis as never) : undefined;

  return {
    ...raw,
    planTier,
    user: raw.user ? { ...raw.user, plan: planTier } : raw.user,
    portfolio,
    kpis,
    tenant: normalizeTenant(raw.tenant),
    institutions: Array.isArray(raw.institutions) ? raw.institutions : [],
    accounts: Array.isArray(raw.accounts) ? raw.accounts : [],
    entitlements: Array.isArray(raw.entitlements) ? raw.entitlements : [],
    consents: Array.isArray(raw.consents) ? raw.consents : [],
    consentAuditLog: Array.isArray(raw.consentAuditLog)
      ? raw.consentAuditLog
      : [],
    connectorSync:
      raw.connectorSync && typeof raw.connectorSync === "object"
        ? raw.connectorSync
        : {},
    household: isHousehold(raw.household) ? raw.household : undefined,
    persistVersion: Math.max(fromVersion, CURRENT_PERSIST_VERSION),
  };
}
