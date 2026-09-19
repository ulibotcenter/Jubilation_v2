import { describe, expect, it } from "vitest";
import {
  canCollect,
  exportConsents,
  grantB3Consent,
  PURGE_GRACE_MS,
  revokeConsent,
} from "@/lib/connectors/consent";
import { ConsentRequiredError, runB3Sync } from "@/lib/connectors/sync";
import { B3Connector } from "@/lib/connectors/b3";

describe("B3 consent", () => {
  const now = new Date("2026-09-19T15:00:00Z");

  it("is a first-class entity with scope, granted_at and evidence", () => {
    const { consent, audit } = grantB3Consent({
      subjectId: "local-user",
      partnerId: "b2c-default",
      now,
    });
    expect(consent.status).toBe("AUTHORISED");
    expect(consent.grantedAt).toBe(now.toISOString());
    expect(consent.revokedAt).toBeNull();
    expect(consent.scopes).toContain("position:equities");
    expect(consent.scopes).toContain("position:treasury");
    expect(consent.evidence.shownText.length).toBeGreaterThan(40);
    expect(consent.evidence.version).toBe("b3-position-v1");
    expect(consent.integratorId).toBe("jubilation");
    expect(consent.partnerId).toBe("b2c-default");
    expect(canCollect(consent, now)).toBe(true);
    expect(audit.action).toBe("grant");
    expect(audit.consentId).toBe(consent.id);
  });

  it("revokes immediately for collection, with 48h purge grace", () => {
    const { consent } = grantB3Consent({
      subjectId: "local-user",
      partnerId: "b2c-default",
      now,
    });
    const revoked = revokeConsent(consent, { actor: "local-user", now });
    expect(revoked.consent.status).toBe("PENDING_PURGE");
    expect(revoked.consent.revokedAt).toBe(now.toISOString());
    expect(revoked.consent.revocationChannel).toBe("app");
    expect(Date.parse(revoked.consent.purgeAfter!)).toBe(
      now.getTime() + PURGE_GRACE_MS
    );
    expect(canCollect(revoked.consent, now)).toBe(false);
    expect(revoked.audit.action).toBe("revoke");
  });

  it("refuses sync without authorised consent", async () => {
    await expect(
      runB3Sync({
        consent: null,
        existing: [],
        institutions: [],
        accounts: [],
        connector: new B3Connector({}),
        now,
      })
    ).rejects.toBeInstanceOf(ConsentRequiredError);

    const { consent } = grantB3Consent({
      subjectId: "u",
      partnerId: "b2c-default",
      now,
    });
    const { consent: revoked } = revokeConsent(consent, {
      actor: "u",
      now,
    });
    await expect(
      runB3Sync({
        consent: revoked,
        existing: [],
        institutions: [],
        accounts: [],
        connector: new B3Connector({}),
        now,
      })
    ).rejects.toBeInstanceOf(ConsentRequiredError);
  });

  it("exports an auditor-readable JSON of consents", () => {
    const { consent } = grantB3Consent({
      subjectId: "local-user",
      partnerId: "b2c-default",
      now,
    });
    const exported = JSON.parse(exportConsents([consent])) as {
      format: string;
      consents: typeof consent[];
    };
    expect(exported.format).toBe("jubilation-consent-v1");
    expect(exported.consents[0]?.id).toBe(consent.id);
    expect(exported.consents[0]?.evidence.version).toBe("b3-position-v1");
  });
});
