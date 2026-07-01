"use client";

import { AnimatePresence, motion } from "framer-motion";
import { TrendingDown, TrendingUp } from "lucide-react";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { useAppStore } from "@/store/useAppStore";
import { formatCurrencyValue, KPI_CONFIGS } from "@/types";

export function NeedleDeltaCard() {
  const delta = useAppStore((s) => s.lastNeedleDelta);
  const currency = useAppStore((s) => s.currency);
  const { t } = useTranslation();

  if (!delta) return null;

  const config = KPI_CONFIGS.find((c) => c.field === delta.field);
  const projDelta = delta.projectedAfter - delta.projectedBefore;
  const positive = projDelta >= 0;

  return (
    <AnimatePresence>
      <motion.div
        className="needle-delta card-surface p-4"
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        role="status"
      >
        <h3 className="text-sm font-bold mb-2">{t("needle.title")}</h3>
        <p className="text-xs text-muted-foreground flex flex-wrap items-center gap-1.5">
          <span>
            Changed <strong className="text-foreground">{config?.label ?? delta.field}</strong>
          </span>
          <span className="text-muted">→</span>
          <span
            className={`inline-flex items-center gap-1 font-semibold tabular-nums ${
              positive ? "text-green-400" : "text-amber-400"
            }`}
          >
            {positive ? (
              <TrendingUp className="w-3.5 h-3.5" size={14} />
            ) : (
              <TrendingDown className="w-3.5 h-3.5" size={14} />
            )}
            {positive ? "+" : ""}
            {formatCurrencyValue(projDelta, currency, true)} at retirement
          </span>
        </p>
      </motion.div>
    </AnimatePresence>
  );
}