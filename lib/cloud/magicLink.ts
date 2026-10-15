import { createHash, randomBytes } from "node:crypto";

/** Login links expire after this. The callback rejects anything older. */
export const MAGIC_LINK_MINUTES = 20;
export const MAGIC_LINK_TTL_MS = MAGIC_LINK_MINUTES * 60 * 1000;

export interface MagicLinkRecord {
  tokenHash: string;
  email: string;
  expiresAt: number;
  consumedAt: number | null;
}

export interface IssuedMagicLink {
  token: string;
  record: MagicLinkRecord;
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function randomToken(): string {
  return randomBytes(32).toString("hex");
}

/** Issue a one-time login token. The raw token is emailed; only the hash is stored. */
export function issueMagicLink(email: string, now = Date.now()): IssuedMagicLink {
  const token = randomToken();
  return {
    token,
    record: {
      tokenHash: hashToken(token),
      email: normalizeEmail(email),
      expiresAt: now + MAGIC_LINK_TTL_MS,
      consumedAt: null,
    },
  };
}

export type MagicLinkRejectReason = "missing" | "expired" | "consumed";

/**
 * Accept a stored link. Does not mark it consumed — the caller does that
 * once, so a replay cannot sign in twice. Postgres uses the same rules:
 * matching hash, unused, and not past `expiresAt`.
 */
export function lookupMagicLink(
  record: MagicLinkRecord | undefined,
  now = Date.now()
):
  | { ok: true; email: string }
  | { ok: false; reason: MagicLinkRejectReason } {
  if (!record) return { ok: false, reason: "missing" };
  if (record.consumedAt !== null) return { ok: false, reason: "consumed" };
  if (record.expiresAt <= now) return { ok: false, reason: "expired" };
  return { ok: true, email: record.email };
}
