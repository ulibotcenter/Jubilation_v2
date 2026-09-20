import { fetchWithTimeout } from "@/lib/api/rateLimit";
import {
  hasB3ProductionCredentials,
  hasB3SandboxCredentials,
  resolveB3Mode,
} from "@/lib/connectors/flags";
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

type RemoteKind = "sandbox" | "live";

/**
 * Pacote de Acesso + Autorização Fintech + API Guia + Posição.
 * Movimentação / Negociação are not called — they do not feed the engine.
 */
const DEFAULT_PATHS = {
  token: "/oauth/token",
  equities: "/api/investidor/posicao/v1/equities",
  treasury: "/api/investidor/posicao/v1/treasury-bonds",
  fixedIncome: "/api/investidor/posicao/v1/fixed-income",
} as const;

function prefixFor(kind: RemoteKind): "B3_SANDBOX" | "B3_PRODUCTION" {
  return kind === "live" ? "B3_PRODUCTION" : "B3_SANDBOX";
}

function envStr(
  env: Record<string, string | undefined>,
  key: string,
  fallback = ""
): string {
  const value = env[key]?.trim();
  return value || fallback;
}

function remoteHeaders(
  env: Record<string, string | undefined>,
  prefix: "B3_SANDBOX" | "B3_PRODUCTION"
): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: "application/json",
  };
  const token = env[`${prefix}_ACCESS_TOKEN`]?.trim();
  if (token) headers.Authorization = `Bearer ${token}`;
  const document = env[`${prefix}_INVESTOR_DOCUMENT`]?.trim();
  if (document) headers["X-Investor-Document"] = document;
  return headers;
}

async function remoteToken(
  env: Record<string, string | undefined>,
  prefix: "B3_SANDBOX" | "B3_PRODUCTION"
): Promise<string | null> {
  const existing = env[`${prefix}_ACCESS_TOKEN`]?.trim();
  if (existing) return existing;
  const base = env[`${prefix}_BASE_URL`]?.replace(/\/$/, "");
  const id = env[`${prefix}_CLIENT_ID`]?.trim();
  const secret = env[`${prefix}_CLIENT_SECRET`]?.trim();
  if (!base || !id || !secret) return null;
  const tokenPath = envStr(env, `${prefix}_TOKEN_PATH`, DEFAULT_PATHS.token);
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
    throw new Error(`B3 ${prefix} token ${res.status}`);
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

async function fetchRemoteRaw(
  env: Record<string, string | undefined>,
  kind: RemoteKind
): Promise<{ raw: Record<string, unknown>; errors: string[] }> {
  const prefix = prefixFor(kind);
  const base = env[`${prefix}_BASE_URL`]!.replace(/\/$/, "");
  const token = await remoteToken(env, prefix);
  const headers = remoteHeaders(env, prefix);
  if (token) headers.Authorization = `Bearer ${token}`;

  const paths = {
    equities: envStr(env, `${prefix}_EQUITIES_PATH`, DEFAULT_PATHS.equities),
    treasury: envStr(env, `${prefix}_TREASURY_PATH`, DEFAULT_PATHS.treasury),
    fixedIncome: envStr(
      env,
      `${prefix}_FIXED_INCOME_PATH`,
      DEFAULT_PATHS.fixedIncome
    ),
    events: env[`${prefix}_EVENTS_PATH`]?.trim() ?? "",
    guide: env[`${prefix}_GUIDE_PATH`]?.trim() ?? "",
    authorization: env[`${prefix}_AUTHORIZATION_PATH`]?.trim() ?? "",
  };

  const optionalGets: Promise<{
    key: string;
    result: { ok: true; body: unknown } | { ok: false; error: string };
  }>[] = [];
  if (paths.guide) {
    optionalGets.push(
      getJson(`${base}${paths.guide}`, headers).then((result) => ({
        key: "guide",
        result,
      }))
    );
  }
  if (paths.authorization) {
    optionalGets.push(
      getJson(`${base}${paths.authorization}`, headers).then((result) => ({
        key: "authorization",
        result,
      }))
    );
  }

  const [equities, treasury, fixedIncome, events, optional] =
    await Promise.all([
      getJson(`${base}${paths.equities}`, headers),
      getJson(`${base}${paths.treasury}`, headers),
      getJson(`${base}${paths.fixedIncome}`, headers),
      paths.events
        ? getJson(`${base}${paths.events}`, headers)
        : Promise.resolve({ ok: true as const, body: [] }),
      Promise.all(optionalGets),
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
    movements: [],
    provisionedEvents: merge(events, "provisionedEvents"),
  };

  for (const item of optional) {
    if (!item.result.ok) {
      errors.push(item.result.error);
      continue;
    }
    raw[item.key] = item.result.body;
  }

  return { raw, errors };
}

function emptyRemoteFetch(
  mode: Extract<ConnectorMode, "sandbox" | "live">,
  message: string,
  now: Date
): CanonicalFetch {
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
      mode,
    },
    raw: {
      asOf: now.toISOString().slice(0, 10),
      receivedAt,
      hash: hashPayload({ error: message }),
      payload: {},
      partial: true,
      errors: [message],
      mode,
    },
  };
}

async function fetchRemoteCanonical(
  env: Record<string, string | undefined>,
  kind: RemoteKind,
  now: Date
): Promise<CanonicalFetch> {
  const mode: ConnectorMode = kind;
  try {
    const { raw, errors } = await fetchRemoteRaw(env, kind);
    const allowlisted = allowlistB3Payload(raw, now.toISOString().slice(0, 10));
    const mapped = mapAllowlistedB3(allowlisted);
    const receivedAt = now.toISOString();
    const partial = errors.length > 0;
    const empty = mapped.holdings.length === 0 && mapped.cashFlows.length === 0;
    return {
      ...mapped,
      health: {
        status: empty && partial ? "unavailable" : partial ? "degraded" : "ok",
        lastSuccessAt: empty ? null : receivedAt,
        lastError: errors[0] ?? null,
        staleness: stalenessOf(allowlisted.asOf, now),
        asOf: allowlisted.asOf,
        partial,
        mode,
      },
      raw: {
        asOf: allowlisted.asOf,
        receivedAt,
        hash: hashPayload(allowlisted),
        payload: allowlisted,
        partial,
        errors,
        mode,
      },
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return emptyRemoteFetch(mode, message, now);
  }
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
 * Fixture unless sandbox or production env vars are complete.
 * Never pretends a fixture is a live B3 response. A failed live/sandbox
 * call stays in that mode with empty holdings — it does not fall back.
 */
export async function fetchB3Canonical(
  options: B3FetchOptions = {}
): Promise<CanonicalFetch> {
  const env = options.env ?? process.env;
  const now = options.now ?? new Date();
  if (hasB3ProductionCredentials(env)) {
    return fetchRemoteCanonical(env, "live", now);
  }
  if (hasB3SandboxCredentials(env)) {
    return fetchRemoteCanonical(env, "sandbox", now);
  }
  return fixtureCanonical(now);
}

export function b3FetchMode(
  env: Record<string, string | undefined> = process.env
): ConnectorMode {
  return resolveB3Mode(env);
}
