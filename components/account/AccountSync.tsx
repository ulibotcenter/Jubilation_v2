"use client";

import { useEffect } from "react";
import {
  parseProfilePreferences,
  sanitizePlanDocument,
} from "@/lib/accounts/planDocument";
import { partializePersistedState } from "@/lib/persist/partialize";
import { canSaveFullPlan } from "@/lib/plans";
import { useAppStore } from "@/store/useAppStore";

/**
 * When cloud auth is on and a session exists, pull the retirement plan from
 * Postgres and keep saving it. Plan tier is left to BillingSync — this
 * never grants premium.
 */
export function AccountSync() {
  const applyServerPlan = useAppStore((s) => s.applyServerPlan);
  const syncSignedInEmail = useAppStore((s) => s.syncSignedInEmail);
  const applyAccountPreferences = useAppStore((s) => s.applyAccountPreferences);

  useEffect(() => {
    let cancelled = false;
    let ready = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const documentFingerprint = () =>
      JSON.stringify(
        sanitizePlanDocument(partializePersistedState(useAppStore.getState()))
      );

    let lastPushed = "";

    const push = async () => {
      if (cancelled || !ready) return;
      if (!canSaveFullPlan(useAppStore.getState().planTier)) return;
      const state = useAppStore.getState();
      const document = sanitizePlanDocument(partializePersistedState(state));
      if (!document) return;
      const next = JSON.stringify(document);
      if (next === lastPushed) return;
      const profile = {
        country: state.country,
        locale: state.locale,
        currency: state.currency,
      };
      try {
        const profileRes = await fetch("/api/account/profile", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(profile),
        });
        if (profileRes.status === 401 || profileRes.status === 503) {
          ready = false;
          return;
        }
        const planRes = await fetch("/api/plan", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(document),
        });
        if (planRes.ok) lastPushed = next;
        if (planRes.status === 401 || planRes.status === 503) ready = false;
      } catch {
        /* local plan stays; the next edit retries */
      }
    };

    const schedule = () => {
      if (!ready || cancelled) return;
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        void push();
      }, 800);
    };

    const unsubscribe = useAppStore.subscribe(() => {
      schedule();
    });

    const pullPlan = async () => {
      const planRes = await fetch("/api/plan", { cache: "no-store" });
      if (!planRes.ok || cancelled) return false;
      const body = (await planRes.json()) as { document?: unknown };
      if (body.document && typeof body.document === "object") {
        applyServerPlan(body.document as Record<string, unknown>);
        lastPushed = documentFingerprint();
        return true;
      }
      return false;
    };

    (async () => {
      try {
        const statusRes = await fetch("/api/auth/status", { cache: "no-store" });
        const status = (await statusRes.json()) as { enabled?: boolean };
        if (cancelled || !status.enabled) return;
        const meRes = await fetch("/api/auth/me", { cache: "no-store" });
        if (!meRes.ok || cancelled) return;
        const me = (await meRes.json()) as {
          email?: string;
          country?: string | null;
          locale?: string | null;
          currency?: string | null;
        };
        if (me.email) syncSignedInEmail(me.email);
        const hadDocument = await pullPlan();
        if (cancelled) return;
        if (!hadDocument) {
          const prefs = parseProfilePreferences({
            country: me.country,
            locale: me.locale,
            currency: me.currency,
          });
          if (prefs) applyAccountPreferences(prefs);
          lastPushed = "";
        }
        ready = true;
        if (!hadDocument) void push();
      } catch {
        /* signed-out or cloud off — localStorage remains the plan */
      }
    })();

    const unsubPlan = useAppStore.subscribe((state, prev) => {
      if (
        canSaveFullPlan(state.planTier) &&
        !canSaveFullPlan(prev.planTier)
      ) {
        void pullPlan();
      }
    });

    return () => {
      cancelled = true;
      ready = false;
      if (timer) clearTimeout(timer);
      unsubscribe();
      unsubPlan();
    };
  }, [applyAccountPreferences, applyServerPlan, syncSignedInEmail]);

  return null;
}
