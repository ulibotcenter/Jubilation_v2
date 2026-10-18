import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { t } from "@/lib/i18n/messages";

describe("nav sign-out labels", () => {
  it("uses Sair in PT, Logout in EN, Salir in ES", () => {
    expect(t("pt", "nav.signOut")).toBe("Sair");
    expect(t("en", "nav.signOut")).toBe("Logout");
    expect(t("es", "nav.signOut")).toBe("Salir");
  });

  it("keeps Entrar for the signed-out menu row", () => {
    expect(t("pt", "nav.signIn")).toBe("Entrar");
  });

  it("makes Painel, Portfólio, and Planos obvious in the signed-in menu", () => {
    const topbar = readFileSync("components/layout/Topbar.tsx", "utf8");
    expect(topbar).toContain('data-user-nav="painel"');
    expect(topbar).toContain("DASHBOARD_PATH");
    expect(topbar).toContain('data-user-nav="portfolio"');
    expect(topbar).toContain("DASHBOARD_PORTFOLIO_PATH");
    expect(topbar).toContain('data-user-nav="planos"');
    expect(topbar).toContain("PLANS_PATH");
    expect(topbar).toContain("CurrentPlanLabel");
    expect(topbar).toContain('placement="menu"');
    expect(t("pt", "nav.dashboard")).toBe("Painel");
    expect(t("pt", "nav.portfolio")).toBe("Portfólio");
    expect(t("pt", "nav.upgrade")).toBe("Planos");
  });
});
