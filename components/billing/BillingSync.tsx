"use client";

import { useEffect } from "react";
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

/** Pull server PlanTier when Stripe is live. Never invent a paid plan in the client. */
export function BillingSync() {
  const syncServerBilling = useAppStore((s) => s.syncServerBilling);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const statusRes = await fetch("/api/billing/status");
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
        const meRes = await fetch("/api/auth/me");
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
        syncServerBilling({
          live: true,
          planTier: asPlanTier(me.planTier),
          subscriptionStatus: asStatus(me.subscriptionStatus),
        });
      } catch {
        if (!cancelled) {
          syncServerBilling({
            live: false,
            planTier: "free",
            subscriptionStatus: "none",
          });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [syncServerBilling]);

  return null;
}
