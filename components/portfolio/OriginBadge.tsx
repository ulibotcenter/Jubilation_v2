"use client";

import { originOf } from "@/lib/holdings/origin";
import { useTranslation } from "@/lib/i18n/useTranslation";
import type { MessageKey } from "@/lib/i18n/messages";
import type { HoldingOrigin, PortfolioAsset } from "@/types";

const ORIGIN_LABEL: Record<HoldingOrigin, MessageKey> = {
  b3: "portfolio.origin.b3",
  irpf: "portfolio.origin.irpf",
  manual: "portfolio.origin.manual",
};

export function OriginBadge({ asset }: { asset: PortfolioAsset }) {
  const { t } = useTranslation();
  const origin = originOf(asset);
  if (!origin) return null;
  return (
    <span className={`origin-badge origin-badge--${origin}`}>
      {t(ORIGIN_LABEL[origin])}
    </span>
  );
}
