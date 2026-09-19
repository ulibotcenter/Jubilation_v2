import { fetchWithTimeout } from "@/lib/api/rateLimit";
import { hasB3SandboxCredentials } from "@/lib/connectors/flags";
import { hashPayload } from "@/lib/connectors/hash";
import { allowlistB3Payload } from "@/lib/connectors/b3/allowlist";
import { B3_FIXTURE_AS_OF, B3_FIXTURE_RAW } from "@/lib/connectors/b3/fixture";
import { mapAllowlistedB3 } from "@/lib/connectors/b3/map";
import type { CanonicalFetch, ConnectorMode } from "@/lib/connectors/types";
import { stalenessOf } from "@/lib/connectors/types";

export interface B3FetchOptions {
  env?: Record<string, string | undefined>;
  now?: Date;
  since?: string;
}

function sandboxHeaders(env: Record<string, string | undefined>): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: "application/json",
  };
  const token = env.B3_SANDBOX_ACCESS_TOKEN?.trim();
  if (token) headers.Authorization = `Bearer ${token}`;
  const document = env.B3_SANDBOX_INVESTOR_DOCUMENT?.trim();
  if (document) headers["X-Investor-Document"] = document;
  return headers;
}

async function sandboxToken(env: Record<string, string | undefined>): Promise<string | null> {
  if (env.B3_SANDBOX_ACCESS_TOKEN?.trim()) {
    return env.B3_SANDBOX_ACCESS_TOKEN.trim();
  }
  const base = env.B3_SANDBOX_BASE_URL?.replace(/\/$/, "");
  const id = env.B3_SANDBOX_CLIENT_ID?.trim();
  const secret = env.B3_SANDBOX_CLIENT_SECRET?.trim();
  if (!base || !id || !secret) return null;
  const tokenPath = env.B3_SANDBOX_TOKEN_PATH ?? "/oauth/token";
  const res = await fetchWithTimeout(`${base}${tokenPath}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      grant_type: "client_credentials",
      client_id: id,
      client_secret: secret,
    }),
    timeoutMs: 8000,
  });
  if (!res.ok) {
    throw new Error(`B3 sandbox token ${res.status}`);
  }
  const body = (await res.json()) as { access_token?: string };
  return body.access_token ?? null;
}

async function getJson(
  url: string,
  headers: Record<string, string>
): Promise<{ ok: true; body: unknown } | { ok: false; error: string }> {
  try {
    const res = await fetchWithTimeout(url, {
      method: "GET",
      headers,
      timeoutMs: 8000,
    });
    if (!res.ok) {
      return { ok: false, error: `${url} → ${res.status}` };
    }
    return { ok: true, body: await res.json() };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

async function fetchSandboxRaw(
  env: Record<string, string | undefined>
): Promise<{ raw: Record<string, unknown>; errors: string[] }> {
  const base = env.B3_SANDBOX_BASE_URL!.replace(/\/$/, "");
  const token = await sandboxToken(env);
  const headers = sandboxHeaders(env);
  if (token) headers.Authorization = `Bearer ${token}`;

  const paths = {
    equities: env.B3_SANDBOX_EQUITIES_PATH ?? "/api/investidor/posicao/v1/equities",
    treasury:
      env.B3_SANDBOX_TREASURY_PATH ?? "/api/investidor/posicao/v1/treasury-bonds",
    fixedIncome:
      env.B3_SANDBOX_FIXED_INCOME_PATH ?? "/api/investidor/posicao/v1/fixed-income",
    movements:
      env.B3_SANDBOX_MOVEMENTS_PATH ?? "/api/investidor/movimentacao/v1/equities",
  };

  const [equities, treasury, fixedIncome, movements] = await Promise.all([
    getJson(`${base}${paths.equities}`, headers),
    getJson(`${base}${paths.treasury}`, headers),
    getJson(`${base}${paths.fixedIncome}`, headers),
    getJson(`${base}${paths.movements}`, headers),
  ]);

  const errors: string[] = [];
  const merge = (
    result: { ok: true; body: unknown } | { ok: false; error: string },
    key: string
  ): unknown => {
    if (!result.ok) {
      errors.push(result.error);
      return [];
    }
    const body = result.body;
    if (body && typeof body === "object" && !Array.isArray(body)) {
      const rec = body as Record<string, unknown>;
      return rec[key] ?? rec.positions ?? body;
    }
    return body;
  };

  const raw: Record<string, unknown> = {
    referenceDate: new Date().toISOString().slice(0, 10),
    equitiesPositions: merge(equities, "equitiesPositions"),
    treasuryBondsPositions: merge(treasury, "treasuryBondsPositions"),
    fixedIncomePositions: merge(fixedIncome, "fixedIncomePositions"),
    movements: merge(movements, "movements"),
  };
  return { raw, errors };
}

export function fixtureCanonical(now = new Date()): CanonicalFetch {
  const allowlisted = allowlistB3Payload(B3_FIXTURE_RAW, B3_FIXTURE_AS_OF);
  const mapped = mapAllowlistedB3(allowlisted);
  const receivedAt = now.toISOString();
  const mode: ConnectorMode = "fixture";
  return {
    ...mapped,
    health: {
      status: "ok",
      lastSuccessAt: receivedAt,
      lastError: null,
      staleness: stalenessOf(allowlisted.asOf, now),
      asOf: allowlisted.asOf,
      partial: false,
      mode,
    },
    raw: {
      asOf: allowlisted.asOf,
      receivedAt,
      hash: hashPayload(allowlisted),
      payload: allowlisted,
      partial: false,
      errors: [],
      mode,
    },
  };
}

/**
 * Fixture unless sandbox env vars are complete. Never pretends a fixture
 * is a live B3 response.
 */
export async function fetchB3Canonical(
  options: B3FetchOptions = {}
): Promise<CanonicalFetch> {
  const env = options.env ?? process.env;
  const now = options.now ?? new Date();
  if (!hasB3SandboxCredentials(env)) {
    return fixtureCanonical(now);
  }

  try {
    const { raw, errors } = await fetchSandboxRaw(env);
    const allowlisted = allowlistB3Payload(
      raw,
      now.toISOString().slice(0, 10)
    );
    const mapped = mapAllowlistedB3(allowlisted);
    const receivedAt = now.toISOString();
    const partial = errors.length > 0;
    const empty =
      mapped.holdings.length === 0 && mapped.cashFlows.length === 0;
    return {
      ...mapped,
      health: {
        status: empty && partial ? "unavailable" : partial ? "degraded" : "ok",
        lastSuccessAt: empty ? null : receivedAt,
        lastError: errors[0] ?? null,
        staleness: stalenessOf(allowlisted.asOf, now),
        asOf: allowlisted.asOf,
        partial,
        mode: "sandbox",
      },
      raw: {
        asOf: allowlisted.asOf,
        receivedAt,
        hash: hashPayload(allowlisted),
        payload: allowlisted,
        partial,
        errors,
        mode: "sandbox",
      },
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const receivedAt = now.toISOString();
    return {
      institutions: [],
      accounts: [],
      holdings: [],
      cashFlows: [],
      health: {
        status: "unavailable",
        lastSuccessAt: null,
        lastError: message,
        staleness: "unknown",
        asOf: null,
        partial: true,
        mode: "sandbox",
      },
      raw: {
        asOf: now.toISOString().slice(0, 10),
        receivedAt,
        hash: hashPayload({ error: message }),
        payload: {},
        partial: true,
        errors: [message],
        mode: "sandbox",
      },
    };
  }
}
