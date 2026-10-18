import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { LEGAL_CONTACT_EMAIL } from "@/lib/legal/contact";
import { PLAIN_LEGAL_POINTS } from "@/lib/legal/policy";
import { TERMS_BODY, TERMS_PATH } from "@/lib/legal/terms";
import { PRIVACY_PATH } from "@/lib/privacy/local";

describe("legal pages", () => {
  it("points terms at /termos and keeps the existing terms sentence", () => {
    expect(TERMS_PATH).toBe("/termos");
    expect(PRIVACY_PATH).toBe("/privacy");
    expect(TERMS_BODY.toLowerCase()).toContain("planejamento educativo");
    expect(TERMS_BODY.toLowerCase()).toContain("não consultoria");
  });

  it("covers only the short facts and the existing mailbox", () => {
    const text = PLAIN_LEGAL_POINTS.map((point) => point.body).join("\n");
    expect(text).toContain("Jubilation / Eleva Projects");
    expect(text).toContain("E-mail, idade, país e dados de plano");
    expect(text).toContain("Conta, plano e suporte");
    expect(text).toContain("Não vendemos dados");
    expect(LEGAL_CONTACT_EMAIL).toBe("noreply@jubilation.life");
  });

  it("links /privacy and /termos from the landing and the plans footer", () => {
    const landing = readFileSync("components/landing/LandingView.tsx", "utf8");
    const footer = readFileSync("components/legal/LegalFooter.tsx", "utf8");
    const planos = readFileSync("app/planos/page.tsx", "utf8");
    const shell = readFileSync("components/layout/AppShell.tsx", "utf8");
    for (const source of [landing, footer]) {
      expect(source).toContain("PRIVACY_PATH");
      expect(source).toContain("TERMS_PATH");
    }
    expect(footer).not.toContain("/privacy#termos");
    expect(planos).toContain("AppShell");
    expect(shell).toContain("LegalFooter");
  });
});
