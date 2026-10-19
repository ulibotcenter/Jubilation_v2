import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { MessageKey } from "@/lib/i18n/catalog/en";
import { t, type AppLocale } from "@/lib/i18n/messages";

const RENDERED_PLANOS_KEYS = [
  "nav.upgrade",
  "upgrade.description",
  "common.backToSettings",
  "upgrade.pendingTitle",
  "upgrade.pendingBody",
  "upgrade.cancelledTitle",
  "upgrade.cancelledBody",
  "upgrade.checking",
  "upgrade.currentPlan",
  "plan.free",
  "plan.premium",
  "plan.horizon",
  "plan.couple",
  "plan.trialing",
  "plan.headerAria",
  "upgrade.unavailableBadge",
  "upgrade.currency.label",
  "upgrade.launchPromo",
  "upgrade.intervalToggle.month",
  "upgrade.intervalToggle.year",
  "upgrade.signInTitle",
  "upgrade.signInBody",
  "upgrade.signInCta",
  "upgrade.plan.individual.title",
  "upgrade.plan.couple.title",
  "upgrade.plan.spouse.title",
  "upgrade.currentOffer",
  "upgrade.interval.year",
  "upgrade.interval.month",
  "upgrade.basicoTrial",
  "upgrade.checkoutTrial",
  "upgrade.checkout",
  "upgrade.checkoutBusy",
  "upgrade.priceNotInCurrency",
  "toast.billing.checkoutError",
] as const satisfies readonly MessageKey[];

const FORBIDDEN =
  /price stripe|stripe price|price de stripe|price id|price_[\w]+|checkout\.session\.completed|não é preciso entidade|entidade nos eua|us entity|entidad de ee\.?\s*uu|pelo ip|from your ip|sale de tu ip|sua ip|your ip|tu ip|STRIPE_SECRET_KEY|DATABASE_URL|AUTH_SECRET|webhook/i;

describe("planos for end users", () => {
  it("keeps name, promo price, launch badge, and subscribe on each card", () => {
    const src = readFileSync("components/upgrade/UpgradePageContent.tsx", "utf8");
    expect(src).toContain("upgrade.plan.individual.title");
    expect(src).toContain("upgrade.plan.couple.title");
    expect(src).toContain("upgrade.plan.spouse.title");
    expect(src).toContain("upgrade.launchPromo");
    expect(src).toContain("plan-price-list");
    expect(src).toContain("plan-price-promo");
    expect(src).toContain("upgrade.checkout");
    expect(src).not.toContain("bodyKey");
    expect(src).not.toMatch(/t\("upgrade\.plan\.individual\.body"\)/);
    expect(src).not.toMatch(/t\("upgrade\.plan\.couple\.body"\)/);
    expect(src).not.toMatch(/t\("upgrade\.plan\.spouse\.body"\)/);
    expect(src).not.toMatch(/t\("upgrade\.plan\.spouse\.privacy"\)/);
  });

  it("does not render Stripe Price, IP, or US-entity notes", () => {
    const src = readFileSync("components/upgrade/UpgradePageContent.tsx", "utf8");
    expect(src).not.toMatch(/t\("upgrade\.regionNote"\)/);
    expect(src).not.toMatch(/t\("upgrade\.currencyFollowsGate"\)/);
    expect(src).not.toMatch(/t\("upgrade\.priceRecommendationNote"\)/);
    expect(src).not.toMatch(/t\("upgrade\.currentPaid"\)/);
    expect(src).not.toMatch(/t\("upgrade\.descriptionLive"\)/);
    expect(src).not.toContain("STRIPE_SECRET_KEY");
    expect(src).not.toContain("DATABASE_URL");
  });

  it("uses user-facing copy in PT, EN, and ES", () => {
    expect(t("pt", "upgrade.launchPromo")).toBe("Promoção de lançamento");
    expect(t("en", "upgrade.launchPromo")).toBe("Launch promotion");
    expect(t("es", "upgrade.launchPromo")).toBe("Promoción de lanzamiento");
    expect(t("pt", "upgrade.checkout")).toBe("Assinar");
    expect(t("en", "upgrade.checkout")).toBe("Subscribe");
    expect(t("es", "upgrade.checkout")).toBe("Suscribirse");

    for (const locale of ["pt", "en", "es"] as const satisfies readonly AppLocale[]) {
      const blob = RENDERED_PLANOS_KEYS.map((key) => t(locale, key)).join("\n");
      expect(blob).not.toMatch(FORBIDDEN);
    }
  });
});
