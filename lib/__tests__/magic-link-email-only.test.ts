import { describe, expect, it } from "vitest";
import { t } from "@/lib/i18n/messages";
import {
  isValidAccountEmail,
  magicLinkRequestBody,
  passwordMeetsAccountMinimum,
} from "@/lib/cloud/magicLinkForm";

describe("magic-link form vs password login", () => {
  it("builds a request from email only, even with an empty password field", () => {
    expect(
      magicLinkRequestBody({
        email: " Ada@Example.com ",
        age: "",
        country: "BR",
      })
    ).toEqual({ email: "Ada@Example.com" });
    expect(passwordMeetsAccountMinimum("")).toBe(false);
    expect(passwordMeetsAccountMinimum("short")).toBe(false);
  });

  it("includes age and country when they are already filled", () => {
    expect(
      magicLinkRequestBody({
        email: "ada@example.com",
        age: "42",
        country: "BR",
      })
    ).toEqual({ email: "ada@example.com", age: 42, country: "BR" });
  });

  it("rejects a missing email for magic link without mentioning a password", () => {
    expect(magicLinkRequestBody({ email: "", age: "", country: "BR" })).toBeNull();
    expect(isValidAccountEmail("")).toBe(false);
    expect(t("pt", "toast.cloud.invalidEmail")).toBe("Precisa de um e-mail válido");
    expect(t("pt", "toast.cloud.invalidEmail")).not.toMatch(/senha/i);
    expect(t("en", "toast.cloud.invalidEmail")).not.toMatch(/password/i);
    expect(t("es", "toast.cloud.invalidEmail")).not.toMatch(/contraseña/i);
  });

  it("still requires email + password ≥ 10 for Entrar and Criar conta", () => {
    expect(isValidAccountEmail("ada@example.com")).toBe(true);
    expect(passwordMeetsAccountMinimum("123456789")).toBe(false);
    expect(passwordMeetsAccountMinimum("1234567890")).toBe(true);
    expect(t("pt", "toast.cloud.invalidInput")).toMatch(/senha/i);
    expect(t("en", "toast.cloud.invalidInput")).toMatch(/password/i);
    expect(t("es", "toast.cloud.invalidInput")).toMatch(/contraseña/i);
  });
});
