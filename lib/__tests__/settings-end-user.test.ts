import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { MessageKey } from "@/lib/i18n/catalog/en";
import { t, type AppLocale } from "@/lib/i18n/messages";

const RENDERED_SETTINGS_KEYS = [
  "settings.description",
  "settings.privacy.title",
  "settings.privacy.body",
  "settings.privacy.link",
  "settings.currency.title",
  "settings.currency.body",
  "settings.currency.source",
  "settings.language.title",
  "settings.language.body",
  "settings.country.title",
  "settings.country.body",
  "settings.account",
  "settings.cloud.title",
  "settings.cloud.checking",
  "settings.cloud.soonBadge",
  "settings.cloud.bodySoon",
  "settings.cloud.bodyReady",
  "settings.cloud.signInEntry",
  "settings.cloud.planSync",
  "settings.cloud.email",
  "settings.cloud.password",
  "settings.cloud.magicLink",
  "settings.cloud.login",
  "settings.cloud.register",
  "settings.cloud.logout",
  "settings.cloud.signedIn",
  "footer.link.terms",
  "footer.link.privacy",
] as const satisfies readonly MessageKey[];

const FORBIDDEN =
  /postgres|frankfurt(?!er)|fráncfort|fra1|cmn|4\.893|região dos dados|regi[oó]n de datos|data region|DATABASE_URL|AUTH_SECRET|backup criptografado|encrypted backup|copia cifrada/i;

describe("settings for end users", () => {
  it("does not render BackupCard on /settings", () => {
    const src = readFileSync("components/settings/SettingsPageContent.tsx", "utf8");
    expect(src).not.toContain("BackupCard");
    expect(src).toContain("CloudAccountCard");
    expect(src).toContain("settings.currency.title");
    expect(src).toContain("settings.language.title");
    expect(src).toContain("TERMS_PATH");
    expect(src).toContain("PRIVACY_PATH");
  });

  it("does not render region copy or encrypted backup tools", () => {
    const src = readFileSync("components/settings/CloudAccountCard.tsx", "utf8");
    expect(src).toContain("SHOW_ENCRYPTED_BACKUP_TOOLS = false");
    expect(src).not.toMatch(/t\("settings\.cloud\.region"/);
    expect(src).not.toMatch(/t\("settings\.cloud\.regionNote"\)/);
    expect(src).toContain("settings.cloud.login");
    expect(src).toContain("settings.cloud.logout");
    expect(src).toContain("onboarding.field.age");
    expect(src).toContain("onboarding.field.country");
    expect(src).toContain("TERMS_PATH");
    expect(src).toContain("PRIVACY_PATH");
  });

  it("keeps backup code in the repo without showing it on settings", () => {
    const backup = readFileSync("components/settings/BackupCard.tsx", "utf8");
    expect(backup).toContain("export function BackupCard");
    expect(backup).toContain("settings.backup.title");
  });

  it("uses user-facing copy in PT, EN, and ES", () => {
    for (const locale of ["pt", "en", "es"] as const satisfies readonly AppLocale[]) {
      const blob = RENDERED_SETTINGS_KEYS.map((key) => t(locale, key)).join("\n");
      expect(blob).not.toMatch(FORBIDDEN);
    }
  });
});
