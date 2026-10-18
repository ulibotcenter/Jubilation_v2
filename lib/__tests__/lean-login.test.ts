import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  CHECKOUT_LOGIN_HREF,
  loginFailureUrl,
  magicLinkCallbackUrl,
  postLoginDestination,
  postLoginUrl,
} from "@/lib/cloud/returnPath";
import { t } from "@/lib/i18n/messages";
import { DASHBOARD_PATH, SIGN_IN_PATH } from "@/lib/routes";

describe("lean sign-in", () => {
  it("points Entrar and Já tenho conta at /entrar", () => {
    expect(SIGN_IN_PATH).toBe("/entrar");
    const landing = readFileSync("components/landing/LandingView.tsx", "utf8");
    const nav = readFileSync("components/layout/PublicNav.tsx", "utf8");
    const topbar = readFileSync("components/layout/Topbar.tsx", "utf8");
    expect(landing).toContain("SIGN_IN_PATH");
    expect(landing).toContain('data-landing-cta="entrar"');
    expect(nav).toContain('data-nav="entrar"');
    expect(nav).toContain("SIGN_IN_PATH");
    expect(topbar).toContain("SIGN_IN_PATH");
    expect(topbar).not.toContain("/settings#cloud-account");
    expect(landing).not.toContain("/settings#cloud-account");
  });

  it("lands on /painel unless checkout already passed /planos", () => {
    expect(postLoginDestination(null)).toBe("/painel");
    expect(postLoginDestination(undefined)).toBe(DASHBOARD_PATH);
    expect(postLoginDestination("/planos")).toBe("/planos");
    expect(postLoginDestination("/settings")).toBe("/painel");
    expect(postLoginDestination("//evil.example")).toBe("/painel");
    expect(postLoginDestination("https://checkout.stripe.com")).toBe("/painel");
    expect(postLoginUrl("https://jubilation.life", null)).toBe(
      "https://jubilation.life/painel"
    );
    expect(postLoginUrl("https://jubilation.life/", "/planos")).toBe(
      "https://jubilation.life/planos"
    );
    expect(CHECKOUT_LOGIN_HREF).toBe("/entrar?next=/planos");
  });

  it("builds a magic-link callback that returns to /painel or /planos", () => {
    expect(magicLinkCallbackUrl("https://jubilation.life", "abc", null)).toBe(
      "https://jubilation.life/api/auth/callback?token=abc"
    );
    expect(
      magicLinkCallbackUrl("https://jubilation.life", "abc", "/planos")
    ).toBe(
      "https://jubilation.life/api/auth/callback?token=abc&next=%2Fplanos"
    );
    expect(
      magicLinkCallbackUrl(
        "https://jubilation.life",
        "abc",
        "https://evil.example"
      )
    ).toBe("https://jubilation.life/api/auth/callback?token=abc");
    expect(loginFailureUrl("https://jubilation.life", "expired", "/planos")).toBe(
      "https://jubilation.life/entrar?auth=expired&next=%2Fplanos"
    );
    expect(loginFailureUrl("https://jubilation.life", "missing", "/settings")).toBe(
      "https://jubilation.life/entrar?auth=missing"
    );
    const callback = readFileSync("app/api/auth/callback/route.ts", "utf8");
    expect(callback).toContain("postLoginUrl");
    expect(callback).toContain("loginFailureUrl");
    expect(callback).not.toContain("/settings");
    const magic = readFileSync("app/api/auth/magic-link/route.ts", "utf8");
    expect(magic).toContain("magicLinkCallbackUrl");
  });

  it("asks only for email, password, and the magic link", () => {
    const form = readFileSync("components/auth/LeanLoginForm.tsx", "utf8");
    expect(form).toContain('data-login-field="email"');
    expect(form).toContain('data-login-field="password"');
    expect(form).toContain("status?.password");
    expect(form).toContain('data-login-action="magic-link"');
    expect(form).not.toMatch(
      /onboarding\.field\.country|name="age"|name="country"|leadAge/
    );
    expect(t("pt", "login.lead")).toBe("Use o e-mail da sua conta.");
    expect(t("en", "login.lead")).toBe("Use your account email.");
    expect(t("es", "login.lead")).toBe("Usa el correo de tu cuenta.");
    expect(t("pt", "nav.signIn")).toBe("Entrar");
    expect(t("en", "nav.signIn")).toBe("Sign in");
    expect(t("es", "nav.signIn")).toBe("Entrar");
    expect(t("pt", "landing.cta.haveAccount")).toBe("Já tenho conta");
    expect(t("en", "landing.cta.haveAccount")).toBe("Already have an account");
    expect(t("es", "landing.cta.haveAccount")).toBe("Ya tengo cuenta");
    expect(t("pt", "settings.cloud.magicLink")).toBe("Receber link de acesso");
    expect(t("en", "settings.cloud.magicLink")).toBe("Email me a login link");
    expect(t("es", "settings.cloud.magicLink")).toBe("Recibir enlace de acceso");
    for (const locale of ["pt", "en", "es"] as const) {
      expect(t(locale, "login.lead")).not.toMatch(/idade|edad|\bage\b|país|country/i);
    }
  });

  it("keeps Settings on the menu", () => {
    const sidebar = readFileSync("components/layout/Sidebar.tsx", "utf8");
    const floating = readFileSync("components/layout/FloatingNav.tsx", "utf8");
    const bottom = readFileSync("components/platform/BottomNav.tsx", "utf8");
    expect(sidebar).toContain("nav.settings");
    expect(floating).toContain("nav.settings");
    expect(bottom).toContain('labelKey: "nav.settings"');
    expect(t("pt", "nav.settings")).toBe("Configurações");
    expect(t("en", "nav.settings")).toBe("Settings");
    expect(t("es", "nav.settings")).toBe("Ajustes");
  });
});
