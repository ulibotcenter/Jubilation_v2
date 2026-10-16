"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { Crown, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/PageHeader";
import {
  LIST_AMOUNT_CENTS,
  PROMO_AMOUNT_CENTS,
  offerIdFor,
  type BillingCurrency,
  type BillingInterval,
  type BillingOfferId,
  type PaidPlanTier,
} from "@/lib/billing/catalog";
import {
  catalogBillingStatus,
  type PublicBillingStatus,
} from "@/lib/billing/config";
import { formatPlanAmount } from "@/lib/billing/display";
import { planTierAfterBrowserReturn } from "@/lib/plans";
import { useTranslation } from "@/lib/i18n/useTranslation";
import type { MessageKey } from "@/lib/i18n/messages";
import { useAppStore } from "@/store/useAppStore";

const PLAN_CARDS: {
  plan: PaidPlanTier;
  slug: "basico" | "completo" | "completo-conjuge";
  titleKey: MessageKey;
  bodyKey: MessageKey;
  accent: boolean;
}[] = [
  {
    plan: "premium",
    slug: "basico",
    titleKey: "upgrade.plan.individual.title",
    bodyKey: "upgrade.plan.individual.body",
    accent: false,
  },
  {
    plan: "horizon",
    slug: "completo",
    titleKey: "upgrade.plan.couple.title",
    bodyKey: "upgrade.plan.couple.body",
    accent: true,
  },
  {
    plan: "couple",
    slug: "completo-conjuge",
    titleKey: "upgrade.plan.spouse.title",
    bodyKey: "upgrade.plan.spouse.body",
    accent: false,
  },
];

function numberLocaleFor(locale: string): string {
  if (locale === "pt") return "pt-BR";
  if (locale === "es") return "es-ES";
  return "en-US";
}

function amountFor(
  status: PublicBillingStatus | null,
  offerId: BillingOfferId,
  currency: BillingCurrency
): { unitAmount: number; listAmount: number; checkoutReady: boolean } {
  const slot = status?.offers
    .find((offer) => offer.id === offerId)
    ?.amounts.find((item) => item.currency === currency);
  return {
    unitAmount: slot?.unitAmount ?? PROMO_AMOUNT_CENTS[offerId][currency],
    listAmount: slot?.listAmount ?? LIST_AMOUNT_CENTS[offerId][currency],
    checkoutReady: Boolean(slot?.checkoutReady),
  };
}

function subscribeSearch() {
  return () => {};
}

function checkoutParam(): string | null {
  return new URLSearchParams(window.location.search).get("checkout");
}

export function UpgradePageContent({
  geoCurrency,
}: {
  geoCurrency: BillingCurrency;
}) {
  const { t, locale } = useTranslation();
  const storedPlan = useAppStore((s) => s.planTier);
  const billingLive = useAppStore((s) => s.billingLive);
  const [currency, setCurrency] = useState<BillingCurrency>(geoCurrency);
  const [interval, setInterval] = useState<BillingInterval>("year");
  const [status, setStatus] = useState<PublicBillingStatus | null>(null);
  const [signedIn, setSignedIn] = useState(false);
  const [accountAvailable, setAccountAvailable] = useState(false);
  const [busyOffer, setBusyOffer] = useState<string | null>(null);
  const checkout = useSyncExternalStore(subscribeSearch, checkoutParam, () => null);
  const planTier = planTierAfterBrowserReturn(storedPlan, checkout);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [res, authRes] = await Promise.all([
          fetch("/api/billing/status"),
          fetch("/api/auth/status"),
        ]);
        const json = (await res.json()) as PublicBillingStatus;
        const auth = (await authRes.json()) as { enabled?: boolean };
        if (cancelled) return;
        setStatus(json);
        const cloud = Boolean(auth.enabled);
        setAccountAvailable(cloud);
        if (!json.enabled || !cloud) {
          setSignedIn(false);
          return;
        }
        const meRes = await fetch("/api/auth/me");
        if (!cancelled) setSignedIn(meRes.ok);
      } catch {
        if (!cancelled) setStatus(catalogBillingStatus({}));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const startCheckout = async (offerId: BillingOfferId) => {
    setBusyOffer(offerId);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ offerId, currency }),
      });
      const body = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !body.url) {
        toast.error(
          body.error === "price_unavailable_for_currency"
            ? t("upgrade.priceNotInCurrency", { code: currency.toUpperCase() })
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
  const numberLocale = numberLocaleFor(locale);
  const currencyLabel = currency.toUpperCase();

  return (
    <div
      className="secondary-page space-y-6"
      data-geo-currency={geoCurrency}
      data-billing-currency={currency}
      data-billing-interval={interval}
    >
      <PageHeader
        icon={Crown}
        title={t("nav.upgrade")}
        description={t("upgrade.description")}
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

      {!loading && (
        <>
          <div className="card-surface p-6 space-y-3">
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
            {!enabled && (
              <p className="settings-soon-badge">{t("upgrade.unavailableBadge")}</p>
            )}
          </div>

          <div className="planos-toolbar">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">
                {t("upgrade.currency.label")}
              </p>
              <div
                className="planos-switch"
                role="group"
                aria-label={t("upgrade.currency.label")}
                data-currency-selector="true"
              >
                {(["brl", "usd", "eur"] as const).map((code) => (
                  <button
                    key={code}
                    type="button"
                    className="planos-switch-btn"
                    aria-pressed={currency === code}
                    data-currency-option={code}
                    onClick={() => setCurrency(code)}
                  >
                    {code.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">
                {t("upgrade.launchPromo")}
              </p>
              <div
                className="planos-switch"
                role="group"
                aria-label={t("upgrade.launchPromo")}
                data-interval-selector="true"
              >
                <button
                  type="button"
                  className="planos-switch-btn"
                  aria-pressed={interval === "month"}
                  data-interval-option="month"
                  onClick={() => setInterval("month")}
                >
                  {t("upgrade.intervalToggle.month")}
                </button>
                <button
                  type="button"
                  className="planos-switch-btn"
                  aria-pressed={interval === "year"}
                  data-interval-option="year"
                  onClick={() => setInterval("year")}
                >
                  {t("upgrade.intervalToggle.year")}
                </button>
              </div>
            </div>
          </div>

          {enabled && accountAvailable && !signedIn && (
            <div className="card-surface p-6 space-y-3">
              <h3 className="font-bold">{t("upgrade.signInTitle")}</h3>
              <p className="text-sm text-muted-foreground">{t("upgrade.signInBody")}</p>
              <Link href="/settings" className="btn-secondary inline-flex text-sm">
                {t("upgrade.signInCta")}
              </Link>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-3">
            {PLAN_CARDS.map((card) => {
              const offerId = offerIdFor(card.plan, interval);
              const amounts = amountFor(status, offerId, currency);
              const promoLabel = formatPlanAmount(
                amounts.unitAmount,
                currency,
                numberLocale
              );
              const listLabel = formatPlanAmount(
                amounts.listAmount,
                currency,
                numberLocale
              );
              const intervalLabel =
                interval === "year"
                  ? t("upgrade.interval.year")
                  : t("upgrade.interval.month");
              const current = billingLive && planTier === card.plan;
              const surface = card.accent ? "card-surface-accent" : "card-surface";

              return (
                <article
                  key={card.plan}
                  className={`${surface} p-6 space-y-3 flex flex-col`}
                  data-plan={card.slug}
                  data-offer={offerId}
                  data-currency={currency}
                  data-interval={interval}
                  data-checkout-ready={amounts.checkoutReady ? "true" : "false"}
                >
                  <h3 className="font-bold">{t(card.titleKey)}</h3>
                  <p className="text-sm text-muted-foreground flex-1">
                    {t(card.bodyKey)}
                  </p>
                  {card.plan === "couple" && (
                    <p
                      className="text-sm text-muted-foreground"
                      data-privacy="no-spouse-b3"
                    >
                      {t("upgrade.plan.spouse.privacy")}
                    </p>
                  )}
                  <p className="text-xs font-semibold uppercase tracking-wide text-accent">
                    {t("upgrade.launchPromo")}
                  </p>
                  <p
                    className="plan-price-list"
                    data-price-list={offerId}
                  >
                    {listLabel}
                    <span> {intervalLabel}</span>
                  </p>
                  <p className="plan-price-promo" data-price-promo={offerId}>
                    {promoLabel}
                    <span className="text-sm font-medium text-muted-foreground">
                      {" "}
                      {intervalLabel}
                    </span>
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {t("upgrade.priceRecommendationNote")}
                  </p>
                  {current ? (
                    <p className="text-xs font-semibold uppercase tracking-wide text-accent">
                      {t("upgrade.currentOffer")}
                    </p>
                  ) : amounts.checkoutReady ? (
                    <button
                      type="button"
                      className="btn-upgrade"
                      data-checkout={offerId}
                      disabled={busyOffer !== null}
                      onClick={() => void startCheckout(offerId)}
                    >
                      {busyOffer === offerId
                        ? t("upgrade.checkoutBusy")
                        : t("upgrade.checkout")}
                    </button>
                  ) : (
                    <p className="text-xs text-muted-foreground" data-checkout-missing={offerId}>
                      {t("upgrade.priceNotInCurrency", { code: currencyLabel })}
                    </p>
                  )}
                </article>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
