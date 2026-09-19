/**
 * Password-protected backup envelope using WebCrypto (PBKDF2 + AES-GCM).
 * The password never leaves the device; the server, if any, only stores this envelope.
 */

export const BACKUP_KIND = "jubilation.backup.v1" as const;
export const BACKUP_PLAINTEXT_KIND = "jubilation.plan.v1" as const;
export const PBKDF2_ITERATIONS = 310_000;
export const MIN_BACKUP_PASSWORD_LENGTH = 10;

export class BackupPasswordError extends Error {
  constructor(message = "wrong-password") {
    super(message);
    this.name = "BackupPasswordError";
  }
}

export class BackupFormatError extends Error {
  constructor(message = "invalid-backup") {
    super(message);
    this.name = "BackupFormatError";
  }
}

export interface BackupEnvelope {
  kind: typeof BACKUP_KIND;
  alg: "AES-GCM";
  kdf: "PBKDF2";
  kdfHash: "SHA-256";
  iterations: number;
  salt: string;
  iv: string;
  ciphertext: string;
  persistVersion: number;
  createdAt: string;
}

export interface BackupPlaintext {
  kind: typeof BACKUP_PLAINTEXT_KIND;
  persistVersion: number;
  exportedAt: string;
  state: Record<string, unknown>;
}

function bytesToBase64(bytes: Uint8Array): string {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(bytes).toString("base64");
  }
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

function base64ToBytes(value: string): Uint8Array {
  if (typeof Buffer !== "undefined") {
    return new Uint8Array(Buffer.from(value, "base64"));
  }
  const binary = atob(value);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}

function getSubtle(): SubtleCrypto {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) {
    throw new BackupFormatError("webcrypto-unavailable");
  }
  return subtle;
}

async function deriveAesKey(
  password: string,
  salt: Uint8Array,
  iterations: number
): Promise<CryptoKey> {
  const subtle = getSubtle();
  const material = await subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveKey"]
  );
  return subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt as BufferSource,
      iterations,
      hash: "SHA-256",
    },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

export function assertBackupPassword(password: string): void {
  if (password.length < MIN_BACKUP_PASSWORD_LENGTH) {
    throw new BackupFormatError("password-too-short");
  }
}

export function isBackupEnvelope(value: unknown): value is BackupEnvelope {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  if (v.kind !== BACKUP_KIND) return false;
  if (v.alg !== "AES-GCM" || v.kdf !== "PBKDF2" || v.kdfHash !== "SHA-256") {
    return false;
  }
  if (typeof v.salt !== "string" || typeof v.iv !== "string") return false;
  if (typeof v.ciphertext !== "string" || v.ciphertext.length < 16) return false;
  if (typeof v.iterations !== "number" || v.iterations < 100_000) return false;
  if ("state" in v || "kpis" in v || "portfolio" in v || "household" in v) {
    return false;
  }
  return true;
}

export function parseBackupEnvelope(value: unknown): BackupEnvelope {
  if (!isBackupEnvelope(value)) {
    throw new BackupFormatError("invalid-envelope");
  }
  return value;
}

export async function encryptBackup(
  plaintext: BackupPlaintext,
  password: string,
  options?: { iterations?: number }
): Promise<BackupEnvelope> {
  assertBackupPassword(password);
  if (plaintext.kind !== BACKUP_PLAINTEXT_KIND) {
    throw new BackupFormatError("invalid-plaintext");
  }
  const iterations = options?.iterations ?? PBKDF2_ITERATIONS;
  const salt = globalThis.crypto.getRandomValues(new Uint8Array(16));
  const iv = globalThis.crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveAesKey(password, salt, iterations);
  const encoded = new TextEncoder().encode(JSON.stringify(plaintext));
  const cipherBuf = await getSubtle().encrypt(
    { name: "AES-GCM", iv },
    key,
    encoded
  );
  return {
    kind: BACKUP_KIND,
    alg: "AES-GCM",
    kdf: "PBKDF2",
    kdfHash: "SHA-256",
    iterations,
    salt: bytesToBase64(salt),
    iv: bytesToBase64(iv),
    ciphertext: bytesToBase64(new Uint8Array(cipherBuf)),
    persistVersion: plaintext.persistVersion,
    createdAt: new Date().toISOString(),
  };
}

export async function decryptBackup(
  envelope: unknown,
  password: string
): Promise<BackupPlaintext> {
  const parsed = parseBackupEnvelope(envelope);
  const salt = base64ToBytes(parsed.salt);
  const iv = base64ToBytes(parsed.iv);
  const ciphertext = base64ToBytes(parsed.ciphertext);
  const key = await deriveAesKey(password, salt, parsed.iterations);
  let decrypted: ArrayBuffer;
  try {
    decrypted = await getSubtle().decrypt(
      { name: "AES-GCM", iv: iv as BufferSource },
      key,
      ciphertext as BufferSource
    );
  } catch {
    throw new BackupPasswordError();
  }
  let body: unknown;
  try {
    body = JSON.parse(new TextDecoder().decode(decrypted));
  } catch {
    throw new BackupFormatError("invalid-plaintext");
  }
  if (
    !body ||
    typeof body !== "object" ||
    (body as BackupPlaintext).kind !== BACKUP_PLAINTEXT_KIND ||
    typeof (body as BackupPlaintext).state !== "object" ||
    (body as BackupPlaintext).state == null
  ) {
    throw new BackupFormatError("invalid-plaintext");
  }
  return body as BackupPlaintext;
}
