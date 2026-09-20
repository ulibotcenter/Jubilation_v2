import type { ConnectorId, ConnectorMode } from "@/lib/connectors/types";

/**
 * Feature flags per connector / region. Open Finance is never on —
 * B3 Área Logada is a commercial licence, not Open Finance.
 */
export function isConnectorEnabled(
  id: ConnectorId,
  env: Record<string, string | undefined> = process.env
): boolean {
  if (id === "manual" || id === "cnis" || id === "irpf") return true;
  if (id === "b3") {
    const flag = env.NEXT_PUBLIC_B3_CONNECTOR ?? env.B3_CONNECTOR;
    return flag !== "off" && flag !== "0" && flag !== "false";
  }
  return false;
}

export function isOpenFinanceEnabled(): boolean {
  return false;
}

function flagOff(value: string | undefined): boolean {
  if (!value) return false;
  const v = value.trim().toLowerCase();
  return v === "0" || v === "false" || v === "off" || v === "no";
}

function hasRemoteCredentials(
  prefix: "B3_SANDBOX" | "B3_PRODUCTION",
  env: Record<string, string | undefined>
): boolean {
  const base = env[`${prefix}_BASE_URL`]?.trim();
  const token = env[`${prefix}_ACCESS_TOKEN`]?.trim();
  const id = env[`${prefix}_CLIENT_ID`]?.trim();
  const secret = env[`${prefix}_CLIENT_SECRET`]?.trim();
  const document = env[`${prefix}_INVESTOR_DOCUMENT`]?.trim();
  if (!base || !document) return false;
  return Boolean(token || (id && secret));
}

export function hasB3SandboxCredentials(
  env: Record<string, string | undefined> = process.env
): boolean {
  return hasRemoteCredentials("B3_SANDBOX", env);
}

/**
 * Licensed Nova Área Logada credentials. Incomplete env stays on fixture.
 * B3_LIVE=off / B3_PRODUCTION=off ignores production keys (same kill-switch
 * idea as BILLING=off) so a half-wired host cannot pretend to be live.
 */
export function hasB3ProductionCredentials(
  env: Record<string, string | undefined> = process.env
): boolean {
  if (flagOff(env.B3_LIVE) || flagOff(env.B3_PRODUCTION)) return false;
  return hasRemoteCredentials("B3_PRODUCTION", env);
}

export function resolveB3Mode(
  env: Record<string, string | undefined> = process.env
): ConnectorMode {
  if (hasB3ProductionCredentials(env)) return "live";
  if (hasB3SandboxCredentials(env)) return "sandbox";
  return "fixture";
}

/** Fixture and sandbox holdings are never live custody. */
export function isLiveB3Mode(
  mode: ConnectorMode | string | null | undefined
): boolean {
  return mode === "live";
}

export type B3DisabledReason = "missing_env" | "sandbox_only" | "disabled";

export interface PublicB3Status {
  enabled: boolean;
  live: boolean;
  mode: ConnectorMode;
  reason: B3DisabledReason | null;
  openFinance: false;
}

export function publicB3Status(
  env: Record<string, string | undefined> = process.env
): PublicB3Status {
  const enabled = isConnectorEnabled("b3", env);
  const live = enabled && hasB3ProductionCredentials(env);
  const mode = enabled ? resolveB3Mode(env) : "fixture";
  if (!enabled) {
    return {
      enabled: false,
      live: false,
      mode: "fixture",
      reason: "disabled",
      openFinance: false,
    };
  }
  if (live) {
    return {
      enabled: true,
      live: true,
      mode: "live",
      reason: null,
      openFinance: false,
    };
  }
  return {
    enabled: true,
    live: false,
    mode,
    reason: mode === "sandbox" ? "sandbox_only" : "missing_env",
    openFinance: false,
  };
}
