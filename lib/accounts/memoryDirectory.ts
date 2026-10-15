import type { AuthUser } from "@/lib/cloud/db";
import {
  hashToken,
  issueMagicLink,
  lookupMagicLink,
  normalizeEmail,
  type MagicLinkRecord,
} from "@/lib/cloud/magicLink";
import type { BillingStore } from "@/lib/billing/persist";
import type { SignupLead } from "@/lib/accounts/signupLead";
import { canSaveFullPlan, type PlanTier } from "@/lib/plans";
import {
  parseProfilePreferences,
  sanitizePlanDocument,
  type ProfilePreferences,
} from "@/lib/accounts/planDocument";

export interface StoredPlan {
  document: Record<string, unknown>;
  updatedAt: string;
}

/**
 * In-memory stand-in for Postgres. Tests exercise the same token, profile,
 * plan, and billing steps the routes run against the database.
 */
export function createMemoryDirectory() {
  const users = new Map<string, AuthUser>();
  const links = new Map<string, MagicLinkRecord>();
  const plans = new Map<string, StoredPlan>();
  const events = new Set<string>();

  function findByEmail(email: string): AuthUser | null {
    const normalized = normalizeEmail(email);
    for (const user of users.values()) {
      if (user.email === normalized) return user;
    }
    return null;
  }

  function createUser(input: {
    id?: string;
    email: string;
    planTier?: PlanTier;
    leadAge?: number | null;
    country?: string | null;
  }): AuthUser {
    const user: AuthUser = {
      id: input.id ?? globalThis.crypto.randomUUID(),
      email: normalizeEmail(input.email),
      passwordHash: null,
      dataRegion: "eu",
      planTier: input.planTier ?? "free",
      stripeCustomerId: null,
      stripeSubscriptionId: null,
      subscriptionStatus: "none",
      preferredCountry: input.country ?? null,
      preferredLocale: null,
      preferredCurrency: null,
      leadAge: input.leadAge ?? null,
    };
    users.set(user.id, user);
    return user;
  }

  const billingStore: BillingStore = {
    async findUserById(id) {
      return users.get(id) ?? null;
    },
    async findUserByStripeCustomerId(customerId) {
      for (const user of users.values()) {
        if (user.stripeCustomerId === customerId) return user;
      }
      return null;
    },
    async findUserByStripeSubscriptionId(subscriptionId) {
      for (const user of users.values()) {
        if (user.stripeSubscriptionId === subscriptionId) return user;
      }
      return null;
    },
    async updateUserBilling(userId, input) {
      const current = users.get(userId);
      if (!current) return null;
      const next: AuthUser = {
        ...current,
        planTier: input.planTier,
        subscriptionStatus: input.subscriptionStatus,
        stripeCustomerId: input.stripeCustomerId ?? current.stripeCustomerId,
        stripeSubscriptionId: input.stripeSubscriptionId ?? null,
      };
      users.set(userId, next);
      return next;
    },
    async recordBillingEvent(input) {
      if (events.has(input.eventId)) return false;
      events.add(input.eventId);
      return true;
    },
  };

  return {
    billingStore,
    createUser,
    getUser(id: string): AuthUser | null {
      return users.get(id) ?? null;
    },
    issueMagicLink(email: string, now = Date.now(), lead?: SignupLead | null): string {
      const issued = issueMagicLink(email, now, lead);
      links.set(issued.record.tokenHash, issued.record);
      return issued.token;
    },
    completeMagicLink(token: string, now = Date.now()): AuthUser | null {
      const record = links.get(hashToken(token));
      const decision = lookupMagicLink(record, now);
      if (!decision.ok || !record) return null;
      record.consumedAt = now;
      const existing = findByEmail(decision.email);
      if (existing) {
        if (record.leadAge != null || record.leadCountry) {
          const next: AuthUser = {
            ...existing,
            leadAge: record.leadAge ?? existing.leadAge,
            preferredCountry: record.leadCountry ?? existing.preferredCountry,
          };
          users.set(existing.id, next);
          return next;
        }
        return existing;
      }
      return createUser({
        email: decision.email,
        leadAge: record.leadAge ?? null,
        country: record.leadCountry ?? null,
      });
    },
    saveProfile(userId: string, body: unknown): ProfilePreferences | null {
      const prefs = parseProfilePreferences(body);
      const user = users.get(userId);
      if (!prefs || !user) return null;
      users.set(userId, {
        ...user,
        preferredCountry: prefs.country,
        preferredLocale: prefs.locale,
        preferredCurrency: prefs.currency,
      });
      return prefs;
    },
    savePlan(userId: string, body: unknown, now = Date.now()): StoredPlan | null {
      const user = users.get(userId);
      if (!user || !canSaveFullPlan(user.planTier)) return null;
      const document = sanitizePlanDocument(body);
      if (!document) return null;
      const stored = { document, updatedAt: new Date(now).toISOString() };
      plans.set(userId, stored);
      return stored;
    },
    getPlan(userId: string): StoredPlan | null {
      return plans.get(userId) ?? null;
    },
  };
}
