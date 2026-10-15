import type { BillingCommand } from "@/lib/billing/events";
import {
  findUserById,
  findUserByStripeCustomerId,
  findUserByStripeSubscriptionId,
  recordBillingEvent,
  updateUserBilling,
  type AuthUser,
  type SubscriptionStatus,
} from "@/lib/cloud/db";
import type { PlanTier } from "@/lib/plans";

export interface BillingStore {
  findUserById(id: string): Promise<AuthUser | null>;
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
}

const postgresBillingStore: BillingStore = {
  findUserById,
  findUserByStripeCustomerId,
  findUserByStripeSubscriptionId,
  updateUserBilling,
  recordBillingEvent,
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
  if (!user) {
    return { applied: false, duplicate: false, userId: null };
  }

  await store.updateUserBilling(user.id, {
    planTier: command.plan,
    subscriptionStatus: command.status,
    stripeCustomerId: command.customerId,
    stripeSubscriptionId: command.subscriptionId,
  });

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
