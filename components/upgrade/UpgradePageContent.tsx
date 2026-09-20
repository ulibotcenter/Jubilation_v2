"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { Crown, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/PageHeader";
import {
  DISPLAY_AMOUNT_CENTS,
  type BillingCurrency,
  type BillingOfferId,
} from "@/lib/billing/catalog";
import {
  parseBillingCurrency,
  publicBillingStatus,
  type PublicBillingStatus,
} from "@/lib/billing/config";
import { formatPlanAmount } from "@/lib/billing/display";
import { useTranslation } from "@/lib/i18n/useTranslation";
import type { MessageKey } from "@/lib/i18n/messages";
import { useAppStore } from "@/store/useAppStore";
import type { Currency } from "@/types";

function numberLocaleFor(locale: string): string {
  if (locale === "pt") return "pt-BR";
  if (locale === "es") return "es-ES";
  return "en-US";
}

function amountFor(
  status: PublicBillingStatus | null,
  offerId: BillingOfferId,
  currency: BillingCurrency
): { unitAmount: number; checkoutReady: boolean } {
  const slot = status?.offers
    .find((offer) => offer.id === offerId)
    ?.amounts.find((item) => item.currency === currency);
  return {
    unitAmount: slot?.unitAmount ?? DISPLAY_AMOUNT_CENTS[offerId][currency],
    checkoutReady: Boolean(slot?.checkoutReady),
  };
}

function subscribeSearch() {
  return () => {};
}

function checkoutParam(): string | null {
  return new URLSearchParams(window.location.search).get("checkout");
}

export function UpgradePageContent() {
  const { t, locale } = useTranslation();
  const planTier = useAppStore((s) => s.planTier);
  const billingLive = useAppStore((s) => s.billingLive);
  const currencyCode = useAppStore((s) => s.currency) as Currency;
  const billingCurrency =
    parseBillingCurrency(currencyCode) ?? ("brl" as BillingCurrency);
  const [status, setStatus] = useState<PublicBillingStatus | null>(null);
  const [signedIn, setSignedIn] = useState(false);
  const [busyOffer, setBusyOffer] = useState<string | null>(null);
  const checkout = useSyncExternalStore(subscribeSearch, checkoutParam, () => null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/billing/status");
        const json = (await res.json()) as PublicBillingStatus;
        if (cancelled) return;
        setStatus(json);
        if (!json.enabled) {
          setSignedIn(false);
          return;
        }
        const meRes = await fetch("/api/auth/me");
        if (!cancelled) setSignedIn(meRes.ok);
      } catch {
        if (!cancelled) {
          setStatus(publicBillingStatus({}));
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const startCheckout = async (offerId: BillingOfferId) => {
    if (!signedIn) {
      toast.error(t("toast.billing.needAccount"));
      return;
    }
    setBusyOffer(offerId);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ offerId, currency: billingCurrency }),
      });
      const body = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !body.url) {
        toast.error(
          body.error === "price_unavailable_for_currency"
            ? t("toast.billing.currencyUnavailable", { code: currencyCode })
            : t("toast.billing.checkoutError")
        );
        return;
      }
      window.location.assign(body.url);
    } catch {
      toast.error(t("toast.billing.checkoutError"));
    } finally {
      setBusyOffer(null);
    }
  };

  const loading = status === null;
  const enabled = Boolean(status?.enabled);
  const reason = status?.reason;
  const numberLocale = numberLocaleFor(locale);

  const yearly = amountFor(status, "premium_yearly", billingCurrency);
  const monthly = amountFor(status, "premium_monthly", billingCurrency);
  const couple = amountFor(status, "horizon_yearly", billingCurrency);

  const yearlyLabel = formatPlanAmount(
    yearly.unitAmount,
    billingCurrency,
    numberLocale
  );
  const monthlyLabel = formatPlanAmount(
    monthly.unitAmount,
    billingCurrency,
    numberLocale
  );
  const coupleLabel = formatPlanAmount(
    couple.unitAmount,
    billingCurrency,
    numberLocale
  );

  const renderCheckout = (
    offerId: BillingOfferId,
    ready: boolean,
    current: boolean
  ) => {
    if (current) {
      return (
        <p className="text-xs font-semibold uppercase tracking-wide text-accent">
          {t("upgrade.currentOffer")}
        </p>
      );
    }
    if (!enabled) return null;
    if (!ready) {
      return (
        <p className="text-xs text-muted-foreground">
          {t("upgrade.priceNotInCurrency", { code: currencyCode })}
        </p>
      );
    }
    return (
      <button
        type="button"
        className="btn-upgrade"
        disabled={!signedIn || busyOffer !== null}
        onClick={() => void startCheckout(offerId)}
      >
        {busyOffer === offerId ? t("upgrade.checkoutBusy") : t("upgrade.checkout")}
      </button>
    );
  };

  return (
    <div className="secondary-page space-y-6">
      <PageHeader
        icon={Crown}
        title={t("nav.upgrade")}
        description={
          enabled ? t("upgrade.descriptionLive") : t("upgrade.description")
        }
        backHref="/settings"
        backLabel={t("common.backToSettings")}
      />

      {checkout === "success" && (
        <div className="card-surface p-6 space-y-2">
          <h3 className="font-bold">{t("upgrade.pendingTitle")}</h3>
          <p className="text-sm text-muted-foreground">{t("upgrade.pendingBody")}</p>
        </div>
      )}

      {checkout === "cancel" && (
        <div className="card-surface p-6 space-y-2">
          <h3 className="font-bold">{t("upgrade.cancelledTitle")}</h3>
          <p className="text-sm text-muted-foreground">{t("upgrade.cancelledBody")}</p>
        </div>
      )}

      {loading && (
        <div className="card-surface p-6 text-sm text-muted-foreground flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" size={16} />
          {t("upgrade.checking")}
        </div>
      )}

      {!loading && !enabled && (
        <div className="card-surface p-6 space-y-3">
          <p className="settings-soon-badge">{t("upgrade.unavailableBadge")}</p>
          <h3 className="font-bold">
            {reason === "cloud_required"
              ? t("upgrade.cloudRequiredTitle")
              : t("upgrade.unavailableTitle")}
          </h3>
          <p className="text-sm text-muted-foreground">
            {reason === "cloud_required"
              ? t("upgrade.cloudRequiredBody")
              : t("upgrade.unavailableBody")}
          </p>
        </div>
      )}

      {!loading && (
        <>
          <div className="card-surface p-6 space-y-2">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              {t("upgrade.currentPlan")}
            </p>
            <p className="font-bold">
              {t("plan.currentBadge", {
                plan: t(`plan.${planTier}` as MessageKey),
              })}
            </p>
            {billingLive && planTier !== "free" ? (
              <p className="text-sm text-muted-foreground">{t("upgrade.currentPaid")}</p>
            ) : (
              <p className="text-sm text-muted-foreground">{t("upgrade.regionNote")}</p>
            )}
            <p className="text-sm text-muted-foreground">
              {t("upgrade.currencyFollowsGate")}
            </p>
          </div>

          {enabled && !signedIn && (
            <div className="card-surface p-6 space-y-3">
              <h3 className="font-bold">{t("upgrade.signInTitle")}</h3>
              <p className="text-sm text-muted-foreground">{t("upgrade.signInBody")}</p>
              <Link href="/settings" className="btn-secondary inline-flex text-sm">
                {t("upgrade.signInCta")}
              </Link>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-3">
            <article
              className="card-surface p-6 space-y-3 flex flex-col"
              data-plan="free"
              data-currency={currencyCode}
            >
              <h3 className="font-bold">{t("upgrade.plan.free.title")}</h3>
              <p className="text-sm text-muted-foreground flex-1">
                {t("upgrade.plan.free.body")}
              </p>
              <p className="text-lg font-semibold" data-price="free">
                {t("upgrade.priceFree")}
              </p>
              {planTier === "free" ? (
                <p className="text-xs font-semibold uppercase tracking-wide text-accent">
                  {t("upgrade.currentOffer")}
                </p>
              ) : null}
            </article>

            <article
              className="card-surface-accent p-6 space-y-3 flex flex-col"
              data-plan="individual"
              data-currency={currencyCode}
            >
              <h3 className="font-bold">{t("upgrade.plan.individual.title")}</h3>
              <p className="text-sm text-muted-foreground flex-1">
                {t("upgrade.plan.individual.body")}
              </p>
              <p className="text-lg font-semibold" data-price="premium_yearly">
                {yearlyLabel}
                <span className="text-sm font-medium text-muted-foreground">
                  {" "}
                  {t("upgrade.interval.year")}
                </span>
              </p>
              <p
                className="text-sm text-muted-foreground"
                data-price="premium_monthly"
              >
                {t("upgrade.decoyMonthly", { amount: monthlyLabel })}
              </p>
              <p className="text-[11px] text-muted-foreground">
                {t("upgrade.priceRecommendationNote")}
              </p>
              {renderCheckout(
                "premium_yearly",
                yearly.checkoutReady,
                billingLive && planTier === "premium"
              )}
              {enabled &&
                monthly.checkoutReady &&
                !(billingLive && planTier === "premium") && (
                  <button
                    type="button"
                    className="btn-ghost text-sm"
                    disabled={!signedIn || busyOffer !== null}
                    onClick={() => void startCheckout("premium_monthly")}
                  >
                    {busyOffer === "premium_monthly"
                      ? t("upgrade.checkoutBusy")
                      : t("upgrade.checkoutMonthly")}
                  </button>
                )}
            </article>

            <article
              className="card-surface p-6 space-y-3 flex flex-col"
              data-plan="couple"
              data-currency={currencyCode}
            >
              <h3 className="font-bold">{t("upgrade.plan.couple.title")}</h3>
              <p className="text-sm text-muted-foreground flex-1">
                {t("upgrade.plan.couple.body")}
              </p>
              <p className="text-lg font-semibold" data-price="horizon_yearly">
                {coupleLabel}
                <span className="text-sm font-medium text-muted-foreground">
                  {" "}
                  {t("upgrade.interval.year")}
                </span>
              </p>
              <p className="text-[11px] text-muted-foreground">
                {t("upgrade.priceRecommendationNote")}
              </p>
              {renderCheckout(
                "horizon_yearly",
                couple.checkoutReady,
                billingLive && planTier === "horizon"
              )}
            </article>
          </div>
        </>
      )}
    </div>
  );
}
