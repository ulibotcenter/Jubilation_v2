import { isValidAccountEmail, passwordMeetsAccountMinimum } from "@/lib/cloud/magicLinkForm";
import {
  hashToken,
  MAGIC_LINK_MINUTES,
  MAGIC_LINK_TTL_MS,
  randomToken,
} from "@/lib/cloud/magicLink";

/** Confirmation links last as long as magic links. Copy in the email matches. */
export const SIGNUP_CONFIRM_MINUTES = MAGIC_LINK_MINUTES;
export const SIGNUP_CONFIRM_TTL_MS = MAGIC_LINK_TTL_MS;

export type PasswordSignupError = "invalid_input" | "password_mismatch";

export type ParsedPasswordSignup =
  | { ok: true; email: string; password: string }
  | { ok: false; error: PasswordSignupError };

export function parsePasswordSignup(body: unknown): ParsedPasswordSignup {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { ok: false, error: "invalid_input" };
  }
  const raw = body as Record<string, unknown>;
  const email = typeof raw.email === "string" ? raw.email.trim() : "";
  const password = typeof raw.password === "string" ? raw.password : "";
  if (!isValidAccountEmail(email) || !passwordMeetsAccountMinimum(password)) {
    return { ok: false, error: "invalid_input" };
  }
  if (typeof raw.passwordConfirm === "string" && raw.passwordConfirm !== password) {
    return { ok: false, error: "password_mismatch" };
  }
  return { ok: true, email, password };
}

export function issueSignupConfirmToken(now = Date.now()): {
  token: string;
  tokenHash: string;
  expiresAt: number;
} {
  const token = randomToken();
  return {
    token,
    tokenHash: hashToken(token),
    expiresAt: now + SIGNUP_CONFIRM_TTL_MS,
  };
}
