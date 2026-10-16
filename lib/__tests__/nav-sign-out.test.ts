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
});
