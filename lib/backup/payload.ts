import { CURRENT_PERSIST_VERSION } from "@/lib/persist/migrate";
import {
  BACKUP_PLAINTEXT_KIND,
  type BackupPlaintext,
} from "@/lib/backup/crypto";

/** Field names that would be a raw CNIS/IRPF/DEC/DBK blob — never back up. */
const RAW_FILE_KEYS = new Set([
  "rawBytes",
  "rawFile",
  "fileBytes",
  "fileContents",
  "cnisRaw",
  "irpfRaw",
  "cnisFile",
  "irpfFile",
  "decBytes",
  "dbkBytes",
  "pdfBytes",
  "rawPdf",
]);

function isRawFileKey(key: string): boolean {
  if (RAW_FILE_KEYS.has(key)) return true;
  if (key === "rawHash") return false;
  return /^(raw|file).*(bytes|buffer|content|blob)$/i.test(key);
}

function looksLikeBinaryBlob(value: unknown): boolean {
  if (value instanceof Uint8Array) return true;
  if (typeof ArrayBuffer !== "undefined" && value instanceof ArrayBuffer) {
    return true;
  }
  return false;
}

export function sanitizeBackupState(value: unknown): unknown {
  if (looksLikeBinaryBlob(value)) return undefined;
  if (Array.isArray(value)) {
    return value
      .map((item) => sanitizeBackupState(item))
      .filter((item) => item !== undefined);
  }
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
      if (isRawFileKey(key)) continue;
      const next = sanitizeBackupState(child);
      if (next !== undefined) out[key] = next;
    }
    return out;
  }
  return value;
}

export function buildBackupPlaintext(
  persisted: Record<string, unknown>
): BackupPlaintext {
  const state = sanitizeBackupState(persisted) as Record<string, unknown>;
  return {
    kind: BACKUP_PLAINTEXT_KIND,
    persistVersion:
      typeof persisted.persistVersion === "number"
        ? persisted.persistVersion
        : CURRENT_PERSIST_VERSION,
    exportedAt: new Date().toISOString(),
    state,
  };
}
