import type { BillingCommand } from "@/lib/billing/events";
import {
  findUserById,
  findUserByStripeCustomerId,
  findUserByStripeSubscriptionId,
  recordBillingEvent,
  updateUserBilling,
  type AuthUser,
} from "@/lib/cloud/db";

export async function resolveBillingUser(
  command: Extract<BillingCommand, { action: "set_plan" }>
): Promise<AuthUser | null> {
  if (command.userId) {
    const byId = await findUserById(command.userId);
    if (byId) return byId;
  }
  if (command.customerId) {
    const byCustomer = await findUserByStripeCustomerId(command.customerId);
    if (byCustomer) return byCustomer;
  }
  if (command.subscriptionId) {
    const bySub = await findUserByStripeSubscriptionId(command.subscriptionId);
    if (bySub) return bySub;
  }
  return null;
}

export async function persistBillingCommand(
  command: BillingCommand
): Promise<{ applied: boolean; duplicate: boolean; userId: string | null }> {
  if (command.action === "ignore") {
    return { applied: false, duplicate: false, userId: null };
  }

  const user = await resolveBillingUser(command);
  if (!user) {
    return { applied: false, duplicate: false, userId: null };
  }

  await updateUserBilling(user.id, {
    planTier: command.plan,
    subscriptionStatus: command.status,
    stripeCustomerId: command.customerId,
    stripeSubscriptionId: command.subscriptionId,
  });

  const recorded = await recordBillingEvent({
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
