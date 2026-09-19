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
