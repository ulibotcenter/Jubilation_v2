import { describe, expect, it } from "vitest";
import { t, type MessageKey } from "@/lib/i18n/messages";
import { currentPlanDisplay } from "@/lib/plans/currentLabel";

function label(
  billingLive: boolean,
  planTier: unknown,
  subscriptionStatus: unknown,
  locale: "pt" | "en" | "es" = "pt"
): string {
  const display = currentPlanDisplay(billingLive, planTier, subscriptionStatus);
  const name = t(locale, `plan.${display.plan}` as MessageKey);
  return display.trialing
    ? t(locale, "plan.trialing", { params: { plan: name } })
    : name;
}

describe("currentPlanDisplay", () => {
  it("shows Grátis when billing is off, even if local state looks paid", () => {
    expect(currentPlanDisplay(false, "horizon", "active")).toEqual({
      plan: "free",
      trialing: false,
    });
    expect(label(false, "horizon", "active")).toBe("Grátis");
  });

  it("shows Grátis for a public or unsigned-in live billing status", () => {
    expect(currentPlanDisplay(true, "free", "none")).toEqual({
      plan: "free",
      trialing: false,
    });
    expect(label(true, "free", "none")).toBe("Grátis");
  });

  it("does not invent Básico from a trialing status on the free tier", () => {
    expect(currentPlanDisplay(true, "free", "trialing")).toEqual({
      plan: "free",
      trialing: false,
    });
    expect(label(true, "free", "trialing")).toBe("Grátis");
  });

  it("shows Básico, Completo, and Completo+Cônjuge from the saved tier", () => {
    expect(label(true, "premium", "active")).toBe("Básico");
    expect(label(true, "horizon", "active")).toBe("Completo");
    expect(label(true, "couple", "active")).toBe("Completo+Cônjuge");
  });

  it("appends the trial suffix only when Stripe status is trialing on a paid plan", () => {
    expect(currentPlanDisplay(true, "premium", "trialing")).toEqual({
      plan: "premium",
      trialing: true,
    });
    expect(label(true, "premium", "trialing")).toBe("Básico (trial)");
    expect(label(true, "premium", "trialing", "en")).toBe("Básico (trial)");
    expect(label(true, "premium", "active")).toBe("Básico");
  });

  it("falls unknown stored values back to free", () => {
    expect(currentPlanDisplay(true, "gold", "active")).toEqual({
      plan: "free",
      trialing: false,
    });
  });
});
