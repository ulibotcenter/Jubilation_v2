import { createHash, randomBytes } from "node:crypto";
import { Pool, type PoolClient } from "pg";
import { cloudAuthConfig } from "@/lib/cloud/config";

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS auth_users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  data_region TEXT NOT NULL DEFAULT 'eu'
);

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

CREATE TABLE IF NOT EXISTS vault_blobs (
  user_id TEXT PRIMARY KEY REFERENCES auth_users(id) ON DELETE CASCADE,
  envelope JSONB NOT NULL,
  schema_version INT NOT NULL,
  data_region TEXT NOT NULL DEFAULT 'eu',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
`;

export interface AuthUser {
  id: string;
  email: string;
  passwordHash: string | null;
  dataRegion: string;
}

let pool: Pool | null = null;
let schemaReady: Promise<void> | null = null;

export const SESSION_COOKIE = "jubilation_session";
export const SESSION_DAYS = 30;
export const MAGIC_LINK_MINUTES = 20;

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function randomToken(): string {
  return randomBytes(32).toString("hex");
}

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
      `SELECT id, email, password_hash, data_region FROM auth_users WHERE email = $1`,
      [normalizeEmail(email)]
    );
    const row = res.rows[0] as
      | {
          id: string;
          email: string;
          password_hash: string | null;
          data_region: string;
        }
      | undefined;
    if (!row) return null;
    return {
      id: row.id,
      email: row.email,
      passwordHash: row.password_hash,
      dataRegion: row.data_region,
    };
  });
}

export async function findUserById(id: string): Promise<AuthUser | null> {
  return withDb(async (client) => {
    const res = await client.query(
      `SELECT id, email, password_hash, data_region FROM auth_users WHERE id = $1`,
      [id]
    );
    const row = res.rows[0] as
      | {
          id: string;
          email: string;
          password_hash: string | null;
          data_region: string;
        }
      | undefined;
    if (!row) return null;
    return {
      id: row.id,
      email: row.email,
      passwordHash: row.password_hash,
      dataRegion: row.data_region,
    };
  });
}

export async function createUser(input: {
  email: string;
  passwordHash?: string | null;
  dataRegion?: string;
}): Promise<AuthUser> {
  const id = globalThis.crypto.randomUUID();
  const email = normalizeEmail(input.email);
  const dataRegion = input.dataRegion ?? "eu";
  return withDb(async (client) => {
    await client.query(
      `INSERT INTO auth_users (id, email, password_hash, data_region)
       VALUES ($1, $2, $3, $4)`,
      [id, email, input.passwordHash ?? null, dataRegion]
    );
    return {
      id,
      email,
      passwordHash: input.passwordHash ?? null,
      dataRegion,
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
      `SELECT u.id, u.email, u.password_hash, u.data_region
       FROM auth_sessions s
       JOIN auth_users u ON u.id = s.user_id
       WHERE s.token_hash = $1 AND s.expires_at > now()`,
      [hashToken(token)]
    );
    const row = res.rows[0] as
      | {
          id: string;
          email: string;
          password_hash: string | null;
          data_region: string;
        }
      | undefined;
    if (!row) return null;
    return {
      id: row.id,
      email: row.email,
      passwordHash: row.password_hash,
      dataRegion: row.data_region,
    };
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

export async function createMagicLink(email: string): Promise<string> {
  const token = randomToken();
  const expires = new Date(Date.now() + MAGIC_LINK_MINUTES * 60 * 1000);
  await withDb(async (client) => {
    await client.query(
      `INSERT INTO auth_magic_links (token_hash, email, expires_at)
       VALUES ($1, $2, $3)`,
      [hashToken(token), normalizeEmail(email), expires.toISOString()]
    );
  });
  return token;
}

export async function consumeMagicLink(token: string): Promise<string | null> {
  return withDb(async (client) => {
    const res = await client.query(
      `UPDATE auth_magic_links
       SET consumed_at = now()
       WHERE token_hash = $1
         AND consumed_at IS NULL
         AND expires_at > now()
       RETURNING email`,
      [hashToken(token)]
    );
    const email = res.rows[0]?.email as string | undefined;
    return email ?? null;
  });
}

export async function upsertVaultEnvelope(input: {
  userId: string;
  envelope: unknown;
  schemaVersion: number;
  dataRegion: string;
}): Promise<{ updatedAt: string }> {
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
        input.dataRegion,
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
    return {
      envelope: row.envelope,
      schemaVersion: row.schema_version,
      dataRegion: row.data_region,
      updatedAt: row.updated_at.toISOString(),
    };
  });
}
