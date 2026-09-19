import type { ConnectorId } from "@/lib/connectors/types";

/**
 * Feature flags per connector / region. Open Finance is never on —
 * B3 Área Logada is a commercial licence, not Open Finance.
 */
export function isConnectorEnabled(id: ConnectorId, env: Record<string, string | undefined> = process.env): boolean {
  if (id === "manual") return true;
  if (id === "b3") {
    const flag = env.NEXT_PUBLIC_B3_CONNECTOR ?? env.B3_CONNECTOR;
    return flag !== "off" && flag !== "0" && flag !== "false";
  }
  return false;
}

export function isOpenFinanceEnabled(): boolean {
  return false;
}

export function hasB3SandboxCredentials(env: Record<string, string | undefined> = process.env): boolean {
  const base = env.B3_SANDBOX_BASE_URL?.trim();
  const token = env.B3_SANDBOX_ACCESS_TOKEN?.trim();
  const id = env.B3_SANDBOX_CLIENT_ID?.trim();
  const secret = env.B3_SANDBOX_CLIENT_SECRET?.trim();
  const document = env.B3_SANDBOX_INVESTOR_DOCUMENT?.trim();
  if (!base || !document) return false;
  return Boolean(token || (id && secret));
}
