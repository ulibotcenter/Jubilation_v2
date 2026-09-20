"use client";

import Link from "next/link";
import { useMemo } from "react";
import { FileUp, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { ConnectB3Button } from "@/components/portfolio/ConnectB3Button";
import { buildOriginTotals } from "@/lib/holdings/origin";
import { FALLBACK_FX_RATES } from "@/lib/fx/types";
import { useTranslation } from "@/lib/i18n/useTranslation";
import type { MessageKey } from "@/lib/i18n/messages";
import { useAppStore } from "@/store/useAppStore";
import { formatCurrencyValue, type HoldingOrigin } from "@/types";

const ORIGIN_TITLE: Record<HoldingOrigin, MessageKey> = {
  b3: "dashboard.origins.b3",
  irpf: "dashboard.origins.irpf",
  manual: "dashboard.origins.manual",
};

const ORIGIN_HINT: Record<HoldingOrigin, MessageKey> = {
  b3: "dashboard.origins.hint.b3",
  irpf: "dashboard.origins.hint.irpf",
  manual: "dashboard.origins.hint.manual",
};

export function OriginTotalsStrip() {
  const { t, locale } = useTranslation();
  const country = useAppStore((s) => s.country);
  const portfolio = useAppStore((s) => s.portfolio);
  const currency = useAppStore((s) => s.currency);
  const fxRates = useAppStore((s) => s.fxSnapshot?.rates) ?? FALLBACK_FX_RATES;
  const b3AsOf = useAppStore((s) => s.connectorSync.b3?.asOf);
  const irpfAsOf = useAppStore((s) => s.connectorSync.irpf?.asOf);
  const refreshPrices = useAppStore((s) => s.refreshPortfolioPrices);
  const isRefreshing = useAppStore((s) => s.isRefreshingPrices);

  const quote = useMemo(
    () => ({ currency, rates: fxRates }),
    [currency, fxRates]
  );
  const totals = useMemo(
    () => buildOriginTotals(portfolio, quote),
    [portfolio, quote]
  );

  if (country !== "BR") return null;

  const asOfFor = (origin: HoldingOrigin): string | null => {
    if (origin === "b3") return totals.b3.asOf ?? b3AsOf ?? null;
    if (origin === "irpf") return totals.irpf.asOf ?? irpfAsOf ?? null;
    return totals.manual.asOf;
  };

  const handleRefresh = async () => {
    if (isRefreshing) return;
    try {
      const { updated, skipped } = await refreshPrices();
      if (updated === 0) {
        toast.info(t("toast.portfolio.noQuotesUpdated"), {
          description: t("toast.portfolio.noQuotesDesc"),
        });
      } else {
        toast.success(
          updated === 1
            ? t("toast.portfolio.pricesUpdatedOne")
            : t("toast.portfolio.pricesUpdatedMany", { n: updated }),
          {
            description:
              skipped > 0
                ? t("toast.portfolio.pricesSkipped", { skipped })
                : t("toast.portfolio.pricesSynced"),
          }
        );
      }
    } catch {
      toast.error(t("toast.portfolio.refreshError"));
    }
  };

  return (
    <section
      id="origin-totals"
      className="origin-totals"
      aria-label={t("dashboard.origins.title")}
    >
      <div className="origin-totals-head">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          {t("dashboard.origins.title")}
        </h2>
        <button
          type="button"
          className="btn-secondary origin-totals-refresh"
          onClick={() => void handleRefresh()}
          disabled={isRefreshing}
        >
          <RefreshCw
            className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`}
            size={14}
          />
          {isRefreshing
            ? t("portfolio.updating")
            : t("dashboard.origins.cta.refresh")}
        </button>
      </div>
      <div className="origin-totals-grid">
        {(["b3", "irpf", "manual"] as HoldingOrigin[]).map((origin) => {
          const row = totals[origin];
          const asOf = asOfFor(origin);
          return (
            <article
              key={origin}
              className="origin-total-card"
              data-origin={origin}
            >
              <p className="origin-total-label">{t(ORIGIN_TITLE[origin])}</p>
              <p className="origin-total-value tabular-nums">
                {formatCurrencyValue(row.value, currency)}
              </p>
              <p className="origin-total-meta">
                {asOf
                  ? t("dashboard.origins.asOf", { date: asOf })
                  : t("dashboard.origins.empty")}
              </p>
              <p className="origin-total-hint">{t(ORIGIN_HINT[origin])}</p>
              <div className="origin-total-cta">
                {origin === "b3" ? (
                  <ConnectB3Button />
                ) : origin === "irpf" ? (
                  <Link href="/settings#import-irpf" className="btn-secondary">
                    <FileUp className="w-4 h-4" size={16} />
                    {t("dashboard.origins.cta.importIrpf")}
                  </Link>
                ) : (
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => void handleRefresh()}
                    disabled={isRefreshing}
                  >
                    <RefreshCw className="w-4 h-4" size={16} />
                    {t("dashboard.origins.cta.refresh")}
                  </button>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
