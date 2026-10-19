import { DASHBOARD_PATH, SIGN_IN_PATH } from "@/lib/routes";

/** Checkout still returns to /planos. The form itself is the lean sign-in page. */
export const CHECKOUT_LOGIN_HREF = `${SIGN_IN_PATH}?next=/planos`;

export function safeReturnPath(value: string | null | undefined): string | null {
  if (value === "/planos") return "/planos";
  return null;
}

/** Default after a successful sign-in. Checkout may override with /planos. */
export function postLoginDestination(value: string | null | undefined): string {
  return safeReturnPath(value) ?? DASHBOARD_PATH;
}

function originBase(origin: string): string {
  return `${origin.replace(/\/$/, "")}/`;
}

export function postLoginUrl(origin: string, next?: string | null): string {
  return new URL(postLoginDestination(next), originBase(origin)).href;
}

export type AuthFailure = "missing" | "expired" | "region";

export function loginFailureUrl(
  origin: string,
  auth: AuthFailure,
  next?: string | null
): string {
  const url = new URL(SIGN_IN_PATH, originBase(origin));
  url.searchParams.set("auth", auth);
  const safe = safeReturnPath(next);
  if (safe) url.searchParams.set("next", safe);
  return url.href;
}

/** Absolute magic-link URL. Only a safe checkout return is appended. */
export function magicLinkCallbackUrl(
  origin: string,
  token: string,
  next?: string | null
): string {
  const url = new URL("/api/auth/callback", originBase(origin));
  url.searchParams.set("token", token);
  const safe = safeReturnPath(next);
  if (safe) url.searchParams.set("next", safe);
  return url.href;
}

/** Absolute signup-confirmation URL. Checkout `next=/planos` stays if present. */
export function confirmCallbackUrl(
  origin: string,
  token: string,
  next?: string | null
): string {
  const url = new URL("/api/auth/confirm", originBase(origin));
  url.searchParams.set("token", token);
  const safe = safeReturnPath(next);
  if (safe) url.searchParams.set("next", safe);
  return url.href;
}

/** Where the confirm callback sends the browser. Session is attached only on ok. */
export function resolveConfirmRedirect(input: {
  origin: string;
  token: string | null | undefined;
  consumed: boolean;
  next?: string | null;
}): { ok: boolean; url: string } {
  if (!input.token) {
    return { ok: false, url: loginFailureUrl(input.origin, "missing", input.next) };
  }
  if (!input.consumed) {
    return { ok: false, url: loginFailureUrl(input.origin, "expired", input.next) };
  }
  return { ok: true, url: postLoginUrl(input.origin, input.next) };
}
