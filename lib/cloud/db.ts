import { Pool, type PoolClient } from "pg";
import { sanitizePlanDocument } from "@/lib/accounts/planDocument";
import { cloudAuthConfig } from "@/lib/cloud/config";
import {
  hashToken,
  issueMagicLink,
  normalizeEmail,
  randomToken,
} from "@/lib/cloud/magicLink";
import type { PlanTier } from "@/lib/plans";
import {
  DEFAULT_DATA_REGION,
  DEFAULT_TENANT_ID,
  assertTenantMayPersistOnHost,
  parseDataRegion,
} from "@/lib/region";

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS tenants (
  id TEXT PRIMARY KEY,
  data_region TEXT NOT NULL DEFAULT 'eu',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
INSERT INTO tenants (id, data_region)
  VALUES ('${DEFAULT_TENANT_ID}', '${DEFAULT_DATA_REGION}')
  ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS auth_users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  data_region TEXT NOT NULL DEFAULT 'eu',
  tenant_id TEXT NOT NULL DEFAULT '${DEFAULT_TENANT_ID}',
  plan_tier TEXT NOT NULL DEFAULT 'free',
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  subscription_status TEXT NOT NULL DEFAULT 'none'
);

ALTER TABLE auth_users ADD COLUMN IF NOT EXISTS plan_tier TEXT NOT NULL DEFAULT 'free';
ALTER TABLE auth_users ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;
ALTER TABLE auth_users ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;
ALTER TABLE auth_users ADD COLUMN IF NOT EXISTS subscription_status TEXT NOT NULL DEFAULT 'none';
ALTER TABLE auth_users ADD COLUMN IF NOT EXISTS tenant_id TEXT NOT NULL DEFAULT '${DEFAULT_TENANT_ID}';
ALTER TABLE auth_users ADD COLUMN IF NOT EXISTS preferred_country TEXT;
ALTER TABLE auth_users ADD COLUMN IF NOT EXISTS preferred_locale TEXT;
ALTER TABLE auth_users ADD COLUMN IF NOT EXISTS preferred_currency TEXT;
ALTER TABLE auth_users ADD COLUMN IF NOT EXISTS lead_age INTEGER;
CREATE UNIQUE INDEX IF NOT EXISTS auth_users_stripe_customer_uidx
  ON auth_users (stripe_customer_id);

CREATE TABLE IF NOT EXISTS auth_sessions (
  token_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS auth_sessions_user_idx ON auth_sessions (user_id);
CREATE INDEX IF NOT EXISTS auth_sessions_exp_idx ON auth_sessions (expires_at);

CREATE TABLE IF NOT EXISTS auth_magic_links (
  token_hash TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  consumed_at TIMESTAMPTZ
);
ALTER TABLE auth_magic_links ADD COLUMN IF NOT EXISTS lead_age INTEGER;
ALTER TABLE auth_magic_links ADD COLUMN IF NOT EXISTS lead_country TEXT;

CREATE TABLE IF NOT EXISTS vault_blobs (
  user_id TEXT PRIMARY KEY REFERENCES auth_users(id) ON DELETE CASCADE,
  envelope JSONB NOT NULL,
  schema_version INT NOT NULL,
  data_region TEXT NOT NULL DEFAULT 'eu',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS billing_events (
  event_id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  user_id TEXT REFERENCES auth_users(id) ON DELETE SET NULL,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS retirement_plans (
  user_id TEXT PRIMARY KEY REFERENCES auth_users(id) ON DELETE CASCADE,
  document JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
`;

export type SubscriptionStatus = "active" | "canceled" | "trialing" | "none";

export interface AuthUser {
  id: string;
  email: string;
  passwordHash: string | null;
  dataRegion: string;
  planTier: PlanTier;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  subscriptionStatus: SubscriptionStatus;
  preferredCountry: string | null;
  preferredLocale: string | null;
  preferredCurrency: string | null;
  leadAge: number | null;
}

const USER_COLUMNS =
  "id, email, password_hash, data_region, plan_tier, stripe_customer_id, stripe_subscription_id, subscription_status, preferred_country, preferred_locale, preferred_currency, lead_age";

interface AuthUserRow {
  id: string;
  email: string;
  password_hash: string | null;
  data_region: string;
  plan_tier?: string | null;
  stripe_customer_id?: string | null;
  stripe_subscription_id?: string | null;
  subscription_status?: string | null;
  preferred_country?: string | null;
  preferred_locale?: string | null;
  preferred_currency?: string | null;
  lead_age?: number | null;
}

function asPlanTier(value: unknown): PlanTier {
  if (value === "premium" || value === "horizon" || value === "free") return value;
  return "free";
}

function asSubscriptionStatus(value: unknown): SubscriptionStatus {
  if (
    value === "active" ||
    value === "canceled" ||
    value === "trialing" ||
    value === "none"
  ) {
    return value;
  }
  return "none";
}

function mapAuthUser(row: AuthUserRow): AuthUser {
  return {
    id: row.id,
    email: row.email,
    passwordHash: row.password_hash,
    dataRegion: row.data_region,
    planTier: asPlanTier(row.plan_tier),
    stripeCustomerId: row.stripe_customer_id ?? null,
    stripeSubscriptionId: row.stripe_subscription_id ?? null,
    subscriptionStatus: asSubscriptionStatus(row.subscription_status),
    preferredCountry: row.preferred_country ?? null,
    preferredLocale: row.preferred_locale ?? null,
    preferredCurrency: row.preferred_currency ?? null,
    leadAge:
      typeof row.lead_age === "number" && Number.isFinite(row.lead_age)
        ? row.lead_age
        : null,
  };
}

let pool: Pool | null = null;
let schemaReady: Promise<void> | null = null;

export const SESSION_COOKIE = "jubilation_session";
export const SESSION_DAYS = 30;

export { MAGIC_LINK_MINUTES, normalizeEmail } from "@/lib/cloud/magicLink";

function sslOption(connectionString: string, ssl: boolean) {
  if (!ssl) return undefined;
  if (/localhost|127\.0\.0\.1/i.test(connectionString)) return undefined;
  return { rejectUnauthorized: false as const };
}

export function getPool(): Pool {
  const cfg = cloudAuthConfig();
  if (!cfg.enabled) {
    throw new Error("cloud_disabled");
  }
  if (!pool) {
    pool = new Pool({
      connectionString: cfg.databaseUrl,
      ssl: sslOption(cfg.databaseUrl, cfg.databaseSsl),
      max: 4,
    });
  }
  return pool;
}

export async function withDb<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await getPool().connect();
  try {
    if (!schemaReady) {
      schemaReady = client.query(SCHEMA_SQL).then(() => undefined);
    }
    await schemaReady;
    return await fn(client);
  } catch (err) {
    schemaReady = null;
    throw err;
  } finally {
    client.release();
  }
}

export async function findUserByEmail(email: string): Promise<AuthUser | null> {
  return withDb(async (client) => {
    const res = await client.query(
      `SELECT ${USER_COLUMNS} FROM auth_users WHERE email = $1`,
      [normalizeEmail(email)]
    );
    const row = res.rows[0] as AuthUserRow | undefined;
    return row ? mapAuthUser(row) : null;
  });
}

export async function findUserById(id: string): Promise<AuthUser | null> {
  return withDb(async (client) => {
    const res = await client.query(
      `SELECT ${USER_COLUMNS} FROM auth_users WHERE id = $1`,
      [id]
    );
    const row = res.rows[0] as AuthUserRow | undefined;
    return row ? mapAuthUser(row) : null;
  });
}

export async function createUser(input: {
  email: string;
  passwordHash?: string | null;
  dataRegion?: string;
  tenantId?: string;
  leadAge?: number | null;
  country?: string | null;
}): Promise<AuthUser> {
  const id = globalThis.crypto.randomUUID();
  const email = normalizeEmail(input.email);
  const dataRegion = parseDataRegion(input.dataRegion ?? DEFAULT_DATA_REGION);
  const tenantId =
    typeof input.tenantId === "string" && input.tenantId.trim()
      ? input.tenantId.trim()
      : DEFAULT_TENANT_ID;
  assertTenantMayPersistOnHost({ dataRegion });
  return withDb(async (client) => {
    await client.query(
      `INSERT INTO tenants (id, data_region)
       VALUES ($1, $2)
       ON CONFLICT (id) DO NOTHING`,
      [tenantId, dataRegion]
    );
    await client.query(
      `INSERT INTO auth_users (
         id, email, password_hash, data_region, tenant_id, plan_tier, subscription_status,
         lead_age, preferred_country
       )
       VALUES ($1, $2, $3, $4, $5, 'free', 'none', $6, $7)`,
      [
        id,
        email,
        input.passwordHash ?? null,
        dataRegion,
        tenantId,
        input.leadAge ?? null,
        input.country ?? null,
      ]
    );
    return {
      id,
      email,
      passwordHash: input.passwordHash ?? null,
      dataRegion,
      planTier: "free",
      stripeCustomerId: null,
      stripeSubscriptionId: null,
      subscriptionStatus: "none",
      preferredCountry: input.country ?? null,
      preferredLocale: null,
      preferredCurrency: null,
      leadAge: input.leadAge ?? null,
    };
  });
}

export async function createSession(userId: string): Promise<string> {
  const token = randomToken();
  const expires = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  await withDb(async (client) => {
    await client.query(
      `INSERT INTO auth_sessions (token_hash, user_id, expires_at)
       VALUES ($1, $2, $3)`,
      [hashToken(token), userId, expires.toISOString()]
    );
  });
  return token;
}

export async function userFromSessionToken(
  token: string | undefined | null
): Promise<AuthUser | null> {
  if (!token) return null;
  return withDb(async (client) => {
    const res = await client.query(
      `SELECT u.id, u.email, u.password_hash, u.data_region,
              u.plan_tier, u.stripe_customer_id, u.stripe_subscription_id, u.subscription_status,
              u.preferred_country, u.preferred_locale, u.preferred_currency
       FROM auth_sessions s
       JOIN auth_users u ON u.id = s.user_id
       WHERE s.token_hash = $1 AND s.expires_at > now()`,
      [hashToken(token)]
    );
    const row = res.rows[0] as AuthUserRow | undefined;
    return row ? mapAuthUser(row) : null;
  });
}

export async function deleteSession(token: string | undefined | null): Promise<void> {
  if (!token) return;
  await withDb(async (client) => {
    await client.query(`DELETE FROM auth_sessions WHERE token_hash = $1`, [
      hashToken(token),
    ]);
  });
}

export async function createMagicLink(
  email: string,
  now = Date.now(),
  lead?: { age: number; country: string } | null
): Promise<string> {
  const issued = issueMagicLink(email, now, lead);
  await withDb(async (client) => {
    await client.query(
      `INSERT INTO auth_magic_links (token_hash, email, expires_at, lead_age, lead_country)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        issued.record.tokenHash,
        issued.record.email,
        new Date(issued.record.expiresAt).toISOString(),
        issued.record.leadAge ?? null,
        issued.record.leadCountry ?? null,
      ]
    );
  });
  return issued.token;
}

export interface ConsumedMagicLink {
  email: string;
  leadAge: number | null;
  leadCountry: string | null;
}

/**
 * Same accept rules as `lookupMagicLink`: hash match, unused, unexpired.
 * The UPDATE is conditional so a replay cannot consume the link twice.
 */
export async function consumeMagicLink(
  token: string
): Promise<ConsumedMagicLink | null> {
  return withDb(async (client) => {
    const res = await client.query(
      `UPDATE auth_magic_links
       SET consumed_at = now()
       WHERE token_hash = $1
         AND consumed_at IS NULL
         AND expires_at > now()
       RETURNING email, lead_age, lead_country`,
      [hashToken(token)]
    );
    const row = res.rows[0] as
      | { email?: string; lead_age?: number | null; lead_country?: string | null }
      | undefined;
    if (!row?.email) return null;
    const leadAge =
      typeof row.lead_age === "number" && Number.isFinite(row.lead_age)
        ? row.lead_age
        : null;
    return {
      email: row.email,
      leadAge,
      leadCountry: row.lead_country ?? null,
    };
  });
}

export async function upsertVaultEnvelope(input: {
  userId: string;
  envelope: unknown;
  schemaVersion: number;
  dataRegion: string;
}): Promise<{ updatedAt: string }> {
  const dataRegion = parseDataRegion(input.dataRegion);
  assertTenantMayPersistOnHost({ dataRegion });
  return withDb(async (client) => {
    const res = await client.query(
      `INSERT INTO vault_blobs (user_id, envelope, schema_version, data_region, updated_at)
       VALUES ($1, $2::jsonb, $3, $4, now())
       ON CONFLICT (user_id) DO UPDATE SET
         envelope = EXCLUDED.envelope,
         schema_version = EXCLUDED.schema_version,
         data_region = EXCLUDED.data_region,
         updated_at = now()
       RETURNING updated_at`,
      [
        input.userId,
        JSON.stringify(input.envelope),
        input.schemaVersion,
        dataRegion,
      ]
    );
    return { updatedAt: (res.rows[0].updated_at as Date).toISOString() };
  });
}

export async function getVaultEnvelope(userId: string): Promise<{
  envelope: unknown;
  schemaVersion: number;
  dataRegion: string;
  updatedAt: string;
} | null> {
  return withDb(async (client) => {
    const res = await client.query(
      `SELECT envelope, schema_version, data_region, updated_at
       FROM vault_blobs WHERE user_id = $1`,
      [userId]
    );
    const row = res.rows[0] as
      | {
          envelope: unknown;
          schema_version: number;
          data_region: string;
          updated_at: Date;
        }
      | undefined;
    if (!row) return null;
    const dataRegion = parseDataRegion(row.data_region);
    assertTenantMayPersistOnHost({ dataRegion });
    return {
      envelope: row.envelope,
      schemaVersion: row.schema_version,
      dataRegion,
      updatedAt: row.updated_at.toISOString(),
    };
  });
}

export async function findUserByStripeCustomerId(
  customerId: string
): Promise<AuthUser | null> {
  return withDb(async (client) => {
    const res = await client.query(
      `SELECT ${USER_COLUMNS} FROM auth_users WHERE stripe_customer_id = $1`,
      [customerId]
    );
    const row = res.rows[0] as AuthUserRow | undefined;
    return row ? mapAuthUser(row) : null;
  });
}

export async function findUserByStripeSubscriptionId(
  subscriptionId: string
): Promise<AuthUser | null> {
  return withDb(async (client) => {
    const res = await client.query(
      `SELECT ${USER_COLUMNS} FROM auth_users WHERE stripe_subscription_id = $1`,
      [subscriptionId]
    );
    const row = res.rows[0] as AuthUserRow | undefined;
    return row ? mapAuthUser(row) : null;
  });
}

export async function updateUserBilling(
  userId: string,
  input: {
    planTier: PlanTier;
    subscriptionStatus: SubscriptionStatus;
    stripeCustomerId?: string | null;
    stripeSubscriptionId?: string | null;
  }
): Promise<AuthUser | null> {
  return withDb(async (client) => {
    const res = await client.query(
      `UPDATE auth_users SET
         plan_tier = $2,
         subscription_status = $3,
         stripe_customer_id = COALESCE($4, stripe_customer_id),
         stripe_subscription_id = $5
       WHERE id = $1
       RETURNING ${USER_COLUMNS}`,
      [
        userId,
        input.planTier,
        input.subscriptionStatus,
        input.stripeCustomerId ?? null,
        input.stripeSubscriptionId ?? null,
      ]
    );
    const row = res.rows[0] as AuthUserRow | undefined;
    return row ? mapAuthUser(row) : null;
  });
}

export async function updateUserPreferences(
  userId: string,
  input: { country: string; locale: string; currency: string }
): Promise<AuthUser | null> {
  return withDb(async (client) => {
    const res = await client.query(
      `UPDATE auth_users SET
         preferred_country = $2,
         preferred_locale = $3,
         preferred_currency = $4
       WHERE id = $1
       RETURNING ${USER_COLUMNS}`,
      [userId, input.country, input.locale, input.currency]
    );
    const row = res.rows[0] as AuthUserRow | undefined;
    return row ? mapAuthUser(row) : null;
  });
}

export async function upsertRetirementPlan(
  userId: string,
  input: unknown
): Promise<{ updatedAt: string } | null> {
  const document = sanitizePlanDocument(input);
  if (!document) return null;
  return withDb(async (client) => {
    const res = await client.query(
      `INSERT INTO retirement_plans (user_id, document, updated_at)
       VALUES ($1, $2::jsonb, now())
       ON CONFLICT (user_id) DO UPDATE SET
         document = EXCLUDED.document,
         updated_at = now()
       RETURNING updated_at`,
      [userId, JSON.stringify(document)]
    );
    return { updatedAt: (res.rows[0].updated_at as Date).toISOString() };
  });
}

export async function getRetirementPlan(userId: string): Promise<{
  document: unknown;
  updatedAt: string;
} | null> {
  return withDb(async (client) => {
    const res = await client.query(
      `SELECT document, updated_at FROM retirement_plans WHERE user_id = $1`,
      [userId]
    );
    const row = res.rows[0] as
      | { document: unknown; updated_at: Date }
      | undefined;
    if (!row) return null;
    return {
      document: row.document,
      updatedAt: row.updated_at.toISOString(),
    };
  });
}

export async function recordBillingEvent(input: {
  eventId: string;
  type: string;
  userId: string | null;
}): Promise<boolean> {
  return withDb(async (client) => {
    const res = await client.query(
      `INSERT INTO billing_events (event_id, type, user_id)
       VALUES ($1, $2, $3)
       ON CONFLICT (event_id) DO NOTHING
       RETURNING event_id`,
      [input.eventId, input.type, input.userId]
    );
    return Boolean(res.rows[0]);
  });
}
