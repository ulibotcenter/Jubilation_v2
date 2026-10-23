"use client";

import { useEffect } from "react";
import {
  billingPollAttempts,
  CHECKOUT_SUCCESS_POLL_MS,
  shouldKeepPollingBilling,
} from "@/lib/billing/syncAfterCheckout";
import { parsePlanTier, type PlanTier } from "@/lib/plans";
import { useAppStore } from "@/store/useAppStore";
import type { UserProfile } from "@/types";

function asPlanTier(value: unknown): PlanTier {
  return parsePlanTier(value);
}

function asStatus(value: unknown): UserProfile["subscriptionStatus"] {
  if (
    value === "active" ||
    value === "canceled" ||
    value === "trialing" ||
    value === "none"
  ) {
    return value;
  }
  return "none";
}

function checkoutParam(): string | null {
  if (typeof window === "undefined") return null;
  return new URLSearchParams(window.location.search).get("checkout");
}

/** Pull server PlanTier when Stripe is live. Never invent a paid plan in the client. */
export function BillingSync() {
  const syncServerBilling = useAppStore((s) => s.syncServerBilling);

  useEffect(() => {
    let cancelled = false;
    const maxAttempts = billingPollAttempts(checkoutParam());

    (async () => {
      for (let attempt = 0; attempt < maxAttempts && !cancelled; attempt++) {
        try {
          const statusRes = await fetch("/api/billing/status", {
            cache: "no-store",
          });
          const status = (await statusRes.json()) as { enabled?: boolean };
          if (cancelled) return;
          if (!status.enabled) {
            syncServerBilling({
              live: false,
              planTier: "free",
              subscriptionStatus: "none",
            });
            return;
          }
          const meRes = await fetch("/api/auth/me", { cache: "no-store" });
          if (!meRes.ok) {
            syncServerBilling({
              live: true,
              planTier: "free",
              subscriptionStatus: "none",
            });
            return;
          }
          const me = (await meRes.json()) as {
            planTier?: unknown;
            subscriptionStatus?: unknown;
          };
          const planTier = asPlanTier(me.planTier);
          const subscriptionStatus = asStatus(me.subscriptionStatus);
          syncServerBilling({
            live: true,
            planTier,
            subscriptionStatus,
          });
          if (
            !shouldKeepPollingBilling({
              live: true,
              planTier,
              attempt,
              maxAttempts,
            })
          ) {
            return;
          }
        } catch {
          if (!cancelled) {
            syncServerBilling({
              live: false,
              planTier: "free",
              subscriptionStatus: "none",
            });
          }
          return;
        }
        await new Promise((resolve) =>
          setTimeout(resolve, CHECKOUT_SUCCESS_POLL_MS)
        );
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [syncServerBilling]);

  return null;
}
