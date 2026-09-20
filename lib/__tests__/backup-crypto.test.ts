import { describe, expect, it } from "vitest";
import {
  BACKUP_KIND,
  BackupFormatError,
  BackupPasswordError,
  MIN_BACKUP_PASSWORD_LENGTH,
  decryptBackup,
  encryptBackup,
  isBackupEnvelope,
  parseBackupEnvelope,
} from "@/lib/backup/crypto";
import { buildBackupPlaintext, sanitizeBackupState } from "@/lib/backup/payload";
import { publicCloudStatus } from "@/lib/cloud/config";
import { hashPassword, verifyPassword } from "@/lib/cloud/passwords";

const PLAN = {
  persistVersion: 1,
  tenant: { id: "b2c-default", dataRegion: "eu" },
  kpis: { currentAge: 48, retirementAge: 60, currentNetWorth: 420000 },
  portfolio: [
    {
      id: "h-1",
      ticker: "PETR4",
      name: "Petrobras",
      quantity: 100,
      currentPrice: 38,
    },
  ],
  household: {
    scope: "both",
    holder: { displayName: "Maria Silva", birthDate: "1976-06-01" },
    spouse: { displayName: "João Silva", birthDate: "1974-02-01" },
  },
  consents: [{ id: "c-b3", provider: "b3", purpose: "holdings" }],
  consentAuditLog: [{ id: "a-1", action: "grant" }],
  rawBytes: new Uint8Array([1, 2, 3, 4]),
  cnisFile: "-----BEGIN CNIS RAW FILE-----",
  irpfRaw: "DEC-IRPF-BRUTO",
  connectorSync: {
    cnis: { rawHash: "abc123", mode: "file" },
  },
};

describe("backup crypto round-trip", () => {
  it("encrypts and decrypts plan, holdings, household and consents", async () => {
    const password = "senha-local-ok";
    expect(password.length).toBeGreaterThanOrEqual(MIN_BACKUP_PASSWORD_LENGTH);
    const plaintext = buildBackupPlaintext(PLAN);
    const envelope = await encryptBackup(plaintext, password);
    expect(envelope.kind).toBe(BACKUP_KIND);
    expect(isBackupEnvelope(envelope)).toBe(true);
    expect(JSON.stringify(envelope)).not.toContain("Maria Silva");
    expect(JSON.stringify(envelope)).not.toContain("PETR4");
    expect(JSON.stringify(envelope)).not.toContain("DEC-IRPF-BRUTO");

    const round = await decryptBackup(envelope, password);
    expect(round.state.kpis).toEqual(PLAN.kpis);
    expect(round.state.portfolio).toEqual(PLAN.portfolio);
    expect(round.state.household).toEqual(PLAN.household);
    expect(round.state.consents).toEqual(PLAN.consents);
    expect(round.state.tenant).toEqual(PLAN.tenant);
    expect(round.state.rawBytes).toBeUndefined();
    expect(round.state.cnisFile).toBeUndefined();
    expect(round.state.irpfRaw).toBeUndefined();
    expect(
      (round.state.connectorSync as { cnis: { rawHash: string } }).cnis.rawHash
    ).toBe("abc123");
  });

  it("rejects the wrong password", async () => {
    const envelope = await encryptBackup(
      buildBackupPlaintext(PLAN),
      "senha-local-ok"
    );
    await expect(decryptBackup(envelope, "senha-errada!")).rejects.toBeInstanceOf(
      BackupPasswordError
    );
  });

  it("rejects a tampered ciphertext", async () => {
    const envelope = await encryptBackup(
      buildBackupPlaintext(PLAN),
      "senha-local-ok"
    );
    const flipped = {
      ...envelope,
      ciphertext:
        envelope.ciphertext.slice(0, -1) +
        (envelope.ciphertext.endsWith("A") ? "B" : "A"),
    };
    await expect(decryptBackup(flipped, "senha-local-ok")).rejects.toBeInstanceOf(
      BackupPasswordError
    );
  });
});

describe("backup payload sanitizer", () => {
  it("drops raw CNIS/IRPF blobs and keeps the plan slice", () => {
    const cleaned = sanitizeBackupState(PLAN) as typeof PLAN;
    expect(cleaned.kpis.currentAge).toBe(48);
    expect(cleaned.portfolio[0]?.ticker).toBe("PETR4");
    expect(cleaned.household.spouse?.displayName).toBe("João Silva");
    expect(cleaned.consents[0]?.provider).toBe("b3");
    expect(cleaned.rawBytes).toBeUndefined();
    expect(cleaned.cnisFile).toBeUndefined();
    expect(cleaned.irpfRaw).toBeUndefined();
  });
});

describe("vault envelope guard", () => {
  it("refuses plaintext plan JSON so the server cannot store the plan in the clear", () => {
    expect(isBackupEnvelope(PLAN)).toBe(false);
    expect(isBackupEnvelope({ kpis: PLAN.kpis, portfolio: PLAN.portfolio })).toBe(
      false
    );
    expect(() => parseBackupEnvelope(PLAN)).toThrow(BackupFormatError);
    expect(() =>
      parseBackupEnvelope({
        kind: BACKUP_KIND,
        alg: "AES-GCM",
        kdf: "PBKDF2",
        kdfHash: "SHA-256",
        iterations: 310000,
        salt: "YQ==",
        iv: "YQ==",
        ciphertext: "not-long-enough",
        persistVersion: 1,
        createdAt: "2026-09-19T00:00:00.000Z",
        kpis: PLAN.kpis,
      })
    ).toThrow(BackupFormatError);
  });
});

describe("cloud config", () => {
  it("stays off without vendor env so the UI must not pretend to sync", () => {
    expect(publicCloudStatus({})).toMatchObject({
      enabled: false,
      magicLink: false,
      password: false,
      dataRegion: "eu",
      hostRegion: "eu",
      functionRegion: "fra1",
      brResidencyLive: false,
    });
    expect(
      publicCloudStatus({
        DATABASE_URL: "postgres://u:p@db.eu:5432/jubilation",
      }).enabled
    ).toBe(false);
  });

  it("turns on password auth when DATABASE_URL and AUTH_SECRET exist", () => {
    const status = publicCloudStatus({
      DATABASE_URL: "postgres://u:p@db.eu-central-1.aws.neon.tech/jubilation",
      AUTH_SECRET: "a-very-long-auth-secret",
    });
    expect(status.enabled).toBe(true);
    expect(status.password).toBe(true);
    expect(status.magicLink).toBe(false);
    expect(status.dataRegion).toBe("eu");
  });

  it("enables magic link only with SMTP", () => {
    const status = publicCloudStatus({
      DATABASE_URL: "postgres://u:p@db.eu/jubilation",
      AUTH_SECRET: "a-very-long-auth-secret",
      SMTP_HOST: "mail.example.eu",
      EMAIL_FROM: "Jubilation <noreply@example.eu>",
    });
    expect(status.magicLink).toBe(true);
  });
});

describe("account password hashing", () => {
  it("round-trips scrypt", async () => {
    const stored = await hashPassword("conta-segura-1");
    expect(stored.startsWith("scrypt$")).toBe(true);
    expect(await verifyPassword("conta-segura-1", stored)).toBe(true);
    expect(await verifyPassword("outra-senha-9", stored)).toBe(false);
  });
});
