/** Stable ids for entities. Never use Date.now(). */
export function createId(prefix?: string): string {
  const uuid = globalThis.crypto.randomUUID();
  return prefix ? `${prefix}-${uuid}` : uuid;
}

export function isUuidLike(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    id
  );
}

function fnv1a32(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/**
 * Deterministic id from connector + external key so reimporting the
 * same B3 line does not mint a new row.
 */
export function stableEntityId(prefix: string, key: string): string {
  const a = fnv1a32(`${prefix}:${key}`).toString(16).padStart(8, "0");
  const b = fnv1a32(`${key}|${prefix}|v1`).toString(16).padStart(8, "0");
  const c = fnv1a32(`v1:${prefix}:${key}:id`).toString(16).padStart(8, "0");
  const d = fnv1a32(`${key}${prefix}`).toString(16).padStart(8, "0");
  const hex = (a + b + c + d).slice(0, 32);
  const uuid = `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
  return `${prefix}-${uuid}`;
}
