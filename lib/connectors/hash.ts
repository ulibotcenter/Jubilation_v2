/** FNV-1a 32-bit, isomorphic — no Node crypto in the client bundle. */
function fnv1a32(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export function hashPayload(value: unknown): string {
  const json = JSON.stringify(value);
  const a = fnv1a32(json).toString(16).padStart(8, "0");
  const b = fnv1a32(`v1:${json}`).toString(16).padStart(8, "0");
  return `${a}${b}`;
}
