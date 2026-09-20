import { createHmac, timingSafeEqual } from "node:crypto";

const DEFAULT_TOLERANCE_SEC = 300;

function parseStripeSignature(header: string): { timestamp: string; signatures: string[] } {
  let timestamp = "";
  const signatures: string[] = [];
  for (const item of header.split(",")) {
    const trimmed = item.trim();
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq);
    const value = trimmed.slice(eq + 1);
    if (key === "t") timestamp = value;
    if (key === "v1") signatures.push(value);
  }
  return { timestamp, signatures };
}

function hmacHex(secret: string, payload: string): string {
  return createHmac("sha256", secret).update(payload, "utf8").digest("hex");
}

function equalHex(a: string, b: string): boolean {
  const left = Buffer.from(a, "hex");
  const right = Buffer.from(b, "hex");
  if (left.length === 0 || left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

/** Stripe-compatible test header: `t=<unix>,v1=<hex>`. */
export function stripeSignatureHeader(
  payload: string,
  secret: string,
  timestamp = Math.floor(Date.now() / 1000)
): string {
  const signature = hmacHex(secret, `${timestamp}.${payload}`);
  return `t=${timestamp},v1=${signature}`;
}

/**
 * Verify `Stripe-Signature` against the raw body and endpoint secret (`whsec_…`).
 * Rejects missing headers, bad HMAC, and timestamps outside the tolerance window.
 */
export function verifyStripeSignature(
  payload: string,
  header: string | null | undefined,
  secret: string,
  nowSec = Math.floor(Date.now() / 1000),
  toleranceSec = DEFAULT_TOLERANCE_SEC
): boolean {
  if (!payload || !header || !secret) return false;
  const { timestamp, signatures } = parseStripeSignature(header);
  if (!timestamp || signatures.length === 0) return false;
  const ts = Number.parseInt(timestamp, 10);
  if (!Number.isFinite(ts)) return false;
  if (Math.abs(nowSec - ts) > toleranceSec) return false;
  const expected = hmacHex(secret, `${timestamp}.${payload}`);
  return signatures.some((signature) => equalHex(signature, expected));
}
