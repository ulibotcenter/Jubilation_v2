"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { Crown, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/PageHeader";
import type {
  BillingOfferId,
  PublicBillingStatus,
} from "@/lib/billing/config";
import { useTranslation } from "@/lib/i18n/useTranslation";
import type { MessageKey } from "@/lib/i18n/messages";
import { useAppStore } from "@/store/useAppStore";

const OFFER_TITLE: Record<BillingOfferId, MessageKey> = {
  premium_yearly: "upgrade.offer.premiumYearly.title",
  premium_monthly: "upgrade.offer.premiumMonthly.title",
  horizon_yearly: "upgrade.offer.horizonYearly.title",
};

const OFFER_BODY: Record<BillingOfferId, MessageKey> = {
  premium_yearly: "upgrade.offer.premiumYearly.body",
  premium_monthly: "upgrade.offer.premiumMonthly.body",
  horizon_yearly: "upgrade.offer.horizonYearly.body",
};

function formatAmount(amount: number, currency: string, locale: string): string {
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(amount / 100);
  } catch {
    return `${(amount / 100).toFixed(2)} ${currency.toUpperCase()}`;
  }
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
          setStatus({
            enabled: false,
            reason: "missing_env",
            settlement: "br",
            offers: [],
          });
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
        body: JSON.stringify({ offerId }),
      });
      const body = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !body.url) {
        toast.error(t("toast.billing.checkoutError"));
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
  const numberLocale = locale === "pt" ? "pt-BR" : locale === "es" ? "es-ES" : "en-US";

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

      {!loading && enabled && (
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
          </div>

          {!signedIn && (
            <div className="card-surface p-6 space-y-3">
              <h3 className="font-bold">{t("upgrade.signInTitle")}</h3>
              <p className="text-sm text-muted-foreground">{t("upgrade.signInBody")}</p>
              <Link href="/settings" className="btn-secondary inline-flex text-sm">
                {t("upgrade.signInCta")}
              </Link>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-3">
            {status?.offers.map((offer) => {
              const current = planTier === offer.plan && billingLive;
              const priceLabel =
                offer.unitAmount != null
                  ? formatAmount(offer.unitAmount, offer.currency, numberLocale)
                  : t("upgrade.priceOnCheckout");
              return (
                <div key={offer.id} className="card-surface p-6 space-y-3 flex flex-col">
                  <h3 className="font-bold">{t(OFFER_TITLE[offer.id])}</h3>
                  <p className="text-sm text-muted-foreground flex-1">
                    {t(OFFER_BODY[offer.id])}
                  </p>
                  <p className="text-lg font-semibold">{priceLabel}</p>
                  {offer.unitAmount != null && (
                    <p className="text-[11px] text-muted-foreground">
                      {t("upgrade.priceRecommendationNote")}
                    </p>
                  )}
                  {current ? (
                    <p className="text-xs font-semibold uppercase tracking-wide text-accent">
                      {t("upgrade.currentOffer")}
                    </p>
                  ) : (
                    <button
                      type="button"
                      className="btn-upgrade"
                      disabled={!signedIn || busyOffer !== null}
                      onClick={() => void startCheckout(offer.id)}
                    >
                      {busyOffer === offer.id
                        ? t("upgrade.checkoutBusy")
                        : t("upgrade.checkout")}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
