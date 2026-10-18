import { describe, expect, it } from "vitest";
import { CHECKOUT_LOGIN_HREF, safeReturnPath } from "@/lib/cloud/returnPath";
import { t } from "@/lib/i18n/messages";

describe("checkout login return path", () => {
  it("only returns to /planos", () => {
    expect(CHECKOUT_LOGIN_HREF).toBe("/entrar?next=/planos");
    expect(safeReturnPath("/planos")).toBe("/planos");
    expect(safeReturnPath("/settings")).toBeNull();
    expect(safeReturnPath("//evil.example")).toBeNull();
    expect(safeReturnPath("https://checkout.stripe.com")).toBeNull();
    expect(safeReturnPath("/planos/../settings")).toBeNull();
    expect(safeReturnPath(null)).toBeNull();
  });
});

describe("checkout login copy", () => {
  it("says Checkout needs a login, in all locales", () => {
    expect(t("pt", "upgrade.signInBody")).toMatch(/só abre depois do login/i);
    expect(t("pt", "upgrade.signInBody")).not.toMatch(/abre mesmo sem login/i);
    expect(t("en", "upgrade.signInBody")).toMatch(/only after you sign in/i);
    expect(t("en", "upgrade.signInBody")).not.toMatch(/without a login/i);
    expect(t("es", "upgrade.signInBody")).toMatch(/solo abre después de entrar/i);
    expect(t("es", "upgrade.signInBody")).not.toMatch(/abre aunque no entres/i);
  });
});
