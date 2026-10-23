import type { BillingCommand } from "@/lib/billing/events";
import {
  findUserByEmail,
  findUserById,
  findUserByStripeCustomerId,
  findUserByStripeSubscriptionId,
  recordBillingEvent,
  updateUserBilling,
  upsertBillingLead,
  type AuthUser,
  type SubscriptionStatus,
} from "@/lib/cloud/db";
import {
  leadPlanFromTier,
  leadStatusFromSubscription,
  type BillingLeadWrite,
} from "@/lib/leads";
import type { PlanTier } from "@/lib/plans";

export interface BillingStore {
  findUserById(id: string): Promise<AuthUser | null>;
  findUserByEmail(email: string): Promise<AuthUser | null>;
  findUserByStripeCustomerId(customerId: string): Promise<AuthUser | null>;
  findUserByStripeSubscriptionId(
    subscriptionId: string
  ): Promise<AuthUser | null>;
  updateUserBilling(
    userId: string,
    input: {
      planTier: PlanTier;
      subscriptionStatus: SubscriptionStatus;
      stripeCustomerId?: string | null;
      stripeSubscriptionId?: string | null;
    }
  ): Promise<AuthUser | null>;
  recordBillingEvent(input: {
    eventId: string;
    type: string;
    userId: string | null;
  }): Promise<boolean>;
  upsertBillingLead(input: BillingLeadWrite): Promise<void>;
}

const postgresBillingStore: BillingStore = {
  findUserById,
  findUserByEmail,
  findUserByStripeCustomerId,
  findUserByStripeSubscriptionId,
  updateUserBilling,
  recordBillingEvent,
  upsertBillingLead,
};

export async function resolveBillingUser(
  command: Extract<BillingCommand, { action: "set_plan" }>,
  store: BillingStore = postgresBillingStore
): Promise<AuthUser | null> {
  if (command.userId) {
    const byId = await store.findUserById(command.userId);
    if (byId) return byId;
  }
  if (command.customerId) {
    const byCustomer = await store.findUserByStripeCustomerId(command.customerId);
    if (byCustomer) return byCustomer;
  }
  if (command.subscriptionId) {
    const bySub = await store.findUserByStripeSubscriptionId(
      command.subscriptionId
    );
    if (bySub) return bySub;
  }
  if (command.email) {
    const byEmail = await store.findUserByEmail(command.email);
    if (byEmail) return byEmail;
  }
  return null;
}

export async function persistBillingCommand(
  command: BillingCommand,
  store: BillingStore = postgresBillingStore
): Promise<{ applied: boolean; duplicate: boolean; userId: string | null }> {
  if (command.action === "ignore") {
    return { applied: false, duplicate: false, userId: null };
  }

  const user = await resolveBillingUser(command, store);
  if (user) {
    await store.updateUserBilling(user.id, {
      planTier: command.plan,
      subscriptionStatus: command.status,
      stripeCustomerId: command.customerId,
      stripeSubscriptionId: command.subscriptionId,
    });
  }

  const leadEmail = user?.email ?? command.email;
  if (leadEmail) {
    try {
      await store.upsertBillingLead({
        email: leadEmail,
        userId: user?.id ?? null,
        plan: leadPlanFromTier(command.plan),
        status: leadStatusFromSubscription(command.status),
        usedCoupon: command.usedCoupon,
        couponCode: command.couponCode,
        subscribedAt: command.subscribedAt,
        renewalDate: command.renewalDate,
        stripeCustomerId: command.customerId,
        country: user?.preferredCountry ?? null,
      });
    } catch {
      // fail closed — same as plan persist when DATABASE_URL is missing
    }
  }

  if (!user) {
    return { applied: false, duplicate: false, userId: null };
  }

  const recorded = await store.recordBillingEvent({
    eventId: command.eventId,
    type: command.eventType,
    userId: user.id,
  });
  return {
    applied: true,
    duplicate: !recorded,
    userId: user.id,
  };
}
