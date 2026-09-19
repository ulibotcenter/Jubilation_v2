import { describe, expect, it } from "vitest";
import { EN, type MessageKey } from "@/lib/i18n/catalog/en";
import { ES } from "@/lib/i18n/catalog/es";
import { PT } from "@/lib/i18n/catalog/pt";
import { t } from "@/lib/i18n/messages";
import {
  consentExportFilename,
  eraseLocalPlan,
  isPrivacyPath,
  PRIVACY_PATH,
} from "@/lib/privacy/local";
import { LOCAL_STORAGE_KEY } from "@/types";

const POLICY_KEYS = [
  "disclaimer.persistent",
  "footer.disclaimer",
  "onboarding.disclaimer",
  "onboarding.warning.title",
  "onboarding.warning.desc",
  "onboarding.checkbox",
  "settings.household.privacyNotice",
  "privacy.collected.body",
  "privacy.notCollected.body",
  "privacy.basis.body",
  "privacy.spouse.body",
  "privacy.erase.body",
  "privacy.export.body",
] as const satisfies readonly MessageKey[];

const TICKER_OR_FUND_PUSH =
  /\b(PETR4|VALE3|ITUB4|BOVA11|IVVB11)\b|troque o fundo|buy this fund|compre o fundo/i;

describe("i18n catalogs", () => {
  it("keeps pt and es in lockstep with en keys", () => {
    const enKeys = Object.keys(EN).sort();
    expect(Object.keys(PT).sort()).toEqual(enKeys);
    expect(Object.keys(ES).sort()).toEqual(enKeys);
  });
});

describe("privacy route", () => {
  it("exposes /privacy without stealing a nav tab", () => {
    expect(PRIVACY_PATH).toBe("/privacy");
    expect(isPrivacyPath("/privacy")).toBe(true);
    expect(isPrivacyPath("/settings")).toBe(false);
  });

  it("erases only the local persist key", () => {
    const removed: string[] = [];
    eraseLocalPlan({
      removeItem(key) {
        removed.push(key);
      },
    });
    expect(removed).toEqual([LOCAL_STORAGE_KEY]);
    expect(consentExportFilename()).toBe("jubilation-consents.json");
  });
});

describe("policy copy", () => {
  it("states educational simulation, not consulting, editable assumptions", () => {
    const persistent = t("pt", "disclaimer.persistent");
    expect(persistent.toLowerCase()).toContain("simulação educativa");
    expect(persistent.toLowerCase()).toContain("não é consultoria");
    expect(persistent.toLowerCase()).toContain("premissas");
  });

  it("lists what is stored and what never enters", () => {
    const collected = t("pt", "privacy.collected.body");
    const notCollected = t("pt", "privacy.notCollected.body");
    expect(collected).toMatch(/plano/i);
    expect(collected).toMatch(/holdings|investimentos/i);
    expect(collected).toMatch(/CNIS/);
    expect(collected).toMatch(/IRPF/);
    expect(collected).toMatch(/aparelho/i);
    expect(collected).toMatch(/fixture/i);
    expect(notCollected).toMatch(/26/);
    expect(notCollected).toMatch(/gov\.br/i);
  });

  it("names contract performance and legitimate interest in plain language", () => {
    const basis = t("pt", "privacy.basis.body");
    expect(basis.toLowerCase()).toContain("execução de contrato");
    expect(basis.toLowerCase()).toContain("legítimo interesse");
    expect(basis.toLowerCase()).toContain("não-sensível");
  });

  it("tells the holder the spouse is third-party data they can delete", () => {
    const notice = t("pt", "settings.household.privacyNotice");
    const page = t("pt", "privacy.spouse.body");
    for (const text of [notice, page]) {
      expect(text.toLowerCase()).toMatch(/outra pessoa/);
      expect(text.toLowerCase()).toMatch(/apagar|remover/);
      expect(text.toLowerCase()).toMatch(/não há integração|não tem conta/);
    }
  });

  it("stays in the CVM 19 safe zone — no ticker or fund recommendation", () => {
    for (const locale of ["pt", "en", "es"] as const) {
      const blob = POLICY_KEYS.map((key) => t(locale, key)).join("\n");
      expect(blob).not.toMatch(TICKER_OR_FUND_PUSH);
      expect(blob.toLowerCase()).not.toContain("troque o fundo x pelo fundo y");
    }
  });
});
