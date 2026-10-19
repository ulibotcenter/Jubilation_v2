import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_RESEND_FROM } from "@/lib/cloud/config";
import { hashToken } from "@/lib/cloud/magicLink";
import { deliverConfirmationEmail } from "@/lib/cloud/mail";
import { hashPassword, verifyPassword } from "@/lib/cloud/passwords";
import {
  confirmCallbackUrl,
  resolveConfirmRedirect,
} from "@/lib/cloud/returnPath";
import {
  issueSignupConfirmToken,
  parsePasswordSignup,
  SIGNUP_CONFIRM_TTL_MS,
} from "@/lib/cloud/signupConfirm";
import { t } from "@/lib/i18n/messages";

const AUTH_ENV = {
  DATABASE_URL: "postgres://u:p@db.eu/jubilation",
  AUTH_SECRET: "a-very-long-auth-secret",
  RESEND_API_KEY: "re_test_key",
};

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
  vi.restoreAllMocks();
});

describe("password signup + confirmation", () => {
  it("requires matching confirm without weakening the 10-char hash rule", () => {
    expect(
      parsePasswordSignup({
        email: "ada@example.com",
        password: "123456789",
        passwordConfirm: "123456789",
      })
    ).toEqual({ ok: false, error: "invalid_input" });
    expect(
      parsePasswordSignup({
        email: "ada@example.com",
        password: "1234567890",
        passwordConfirm: "1234567899",
      })
    ).toEqual({ ok: false, error: "password_mismatch" });
    expect(
      parsePasswordSignup({
        email: " Ada@Example.com ",
        password: "1234567890",
        passwordConfirm: "1234567890",
      })
    ).toEqual({ ok: true, email: "Ada@Example.com", password: "1234567890" });
    expect(
      parsePasswordSignup({
        email: "ada@example.com",
        password: "1234567890",
      })
    ).toEqual({ ok: true, email: "ada@example.com", password: "1234567890" });
  });

  it("reuses the same scrypt hash as /api/auth/login", async () => {
    const stored = await hashPassword("conta-segura-1");
    expect(stored.startsWith("scrypt$16384$8$1$")).toBe(true);
    expect(await verifyPassword("conta-segura-1", stored)).toBe(true);
    expect(await verifyPassword("conta-segura-2", stored)).toBe(false);
    const login = readFileSync("app/api/auth/login/route.ts", "utf8");
    const register = readFileSync("app/api/auth/register/route.ts", "utf8");
    expect(login).toContain("verifyPassword");
    expect(register).toContain("hashPassword");
    expect(register).toContain("createPendingSignup");
    expect(register).not.toContain("createSession");
    expect(register).not.toContain("attachSession");
  });

  it("stores a hashed confirm token, not the raw value", () => {
    const issued = issueSignupConfirmToken(1_000);
    expect(issued.token).toMatch(/^[a-f0-9]{64}$/);
    expect(issued.tokenHash).toBe(hashToken(issued.token));
    expect(issued.tokenHash).not.toBe(issued.token);
    expect(issued.expiresAt).toBe(1_000 + SIGNUP_CONFIRM_TTL_MS);
  });

  it("sends a missing or bad token to /entrar and a stubbed confirm to /painel", () => {
    expect(
      resolveConfirmRedirect({
        origin: "https://jubilation.life",
        token: null,
        consumed: false,
      })
    ).toEqual({
      ok: false,
      url: "https://jubilation.life/entrar?auth=missing",
    });
    expect(
      resolveConfirmRedirect({
        origin: "https://jubilation.life",
        token: "deadbeef",
        consumed: false,
        next: "/planos",
      })
    ).toEqual({
      ok: false,
      url: "https://jubilation.life/entrar?auth=expired&next=%2Fplanos",
    });
    expect(
      resolveConfirmRedirect({
        origin: "https://jubilation.life",
        token: "ok-token",
        consumed: true,
      })
    ).toEqual({
      ok: true,
      url: "https://jubilation.life/painel",
    });
    expect(
      resolveConfirmRedirect({
        origin: "https://jubilation.life",
        token: "ok-token",
        consumed: true,
        next: "/planos",
      }).url
    ).toBe("https://jubilation.life/planos");
    expect(
      resolveConfirmRedirect({
        origin: "https://jubilation.life",
        token: "ok-token",
        consumed: true,
        next: "/settings",
      }).url
    ).toBe("https://jubilation.life/painel");
    expect(
      confirmCallbackUrl("https://jubilation.life", "abc", "/planos")
    ).toBe("https://jubilation.life/api/auth/confirm?token=abc&next=%2Fplanos");
    const confirm = readFileSync("app/api/auth/confirm/route.ts", "utf8");
    expect(confirm).toContain("consumePendingSignup");
    expect(confirm).toContain("createSession");
    expect(confirm).toContain("resolveConfirmRedirect");
    expect(confirm).not.toContain("/settings");
  });

  it("sends the confirmation email from Jubilation <noreply@jubilation.life>", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ id: "email_confirm_1" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const delivered = await deliverConfirmationEmail(
      {
        to: "ada@example.com",
        url: "https://jubilation.life/api/auth/confirm?token=x",
      },
      AUTH_ENV
    );

    expect(delivered).toEqual({
      id: "email_confirm_1",
      from: DEFAULT_RESEND_FROM,
      transport: "resend",
    });
    const payload = JSON.parse(
      String((fetchMock.mock.calls[0] as [string, RequestInit])[1].body)
    ) as { from: string; subject: string; to: string[] };
    expect(payload.from).toBe("Jubilation <noreply@jubilation.life>");
    expect(payload.to).toEqual(["ada@example.com"]);
    expect(payload.subject).toMatch(/confirm/i);
  });

  it("keeps PT, EN, and ES copy for create-account", () => {
    expect(t("pt", "settings.cloud.register")).toBe("Criar conta");
    expect(t("en", "settings.cloud.register")).toBe("Create account");
    expect(t("es", "settings.cloud.register")).toBe("Crear cuenta");
    expect(t("pt", "settings.cloud.passwordConfirm")).toBe("Confirmar senha");
    expect(t("en", "settings.cloud.passwordConfirm")).toBe("Confirm password");
    expect(t("es", "settings.cloud.passwordConfirm")).toBe("Confirmar contraseña");
    expect(t("pt", "login.signupLead")).toMatch(/confirmar/i);
    expect(t("en", "login.signupLead")).toMatch(/confirm/i);
    expect(t("es", "login.signupLead")).toMatch(/confirmar/i);
    expect(t("pt", "toast.cloud.confirmSent")).toMatch(/confirmação/i);
    expect(t("en", "toast.cloud.confirmSent")).toMatch(/confirmation/i);
    expect(t("es", "toast.cloud.confirmSent")).toMatch(/confirmación/i);
    expect(t("pt", "toast.cloud.passwordMismatch")).toMatch(/senhas/i);
    expect(t("en", "toast.cloud.passwordMismatch")).toMatch(/passwords/i);
    expect(t("es", "toast.cloud.passwordMismatch")).toMatch(/contraseñas/i);
    expect(t("pt", "settings.cloud.magicLink")).toBe("Receber link de acesso");
  });
});
