"use client";

import { Share2 } from "lucide-react";
import { toast } from "sonner";
import { buildShareText } from "@/lib/shareSnapshot";
import { canAccess } from "@/lib/plans";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { useAppStore } from "@/store/useAppStore";
import { CURRENCY_SYMBOLS } from "@/types";

export function ShareSnapshotButton() {
  const { t } = useTranslation();
  const kpis = useAppStore((s) => s.kpis);
  const projections = useAppStore((s) => s.projections);
  const plan = useAppStore((s) => s.planTier);
  const projected = projections[projections.length - 1]?.portfolioValue ?? 0;
  const sym = CURRENCY_SYMBOLS[useAppStore((s) => s.currency)];

  const share = async () => {
    const text = buildShareText({
      kpis,
      projected,
      score: Math.min(
        100,
        Math.round((projected / (kpis.desiredMonthlyIncome * 12 * 25 || 1)) * 100)
      ),
      currency: sym,
      branded: canAccess(plan, "share_branded"),
    });
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Copied for social", {
        description: "Paste on LinkedIn, X, or WhatsApp.",
      });
    } catch {
      toast.error("Could not copy");
    }
  };

  return (
    <button type="button" className="btn-secondary gap-1.5" onClick={share}>
      <Share2 className="w-4 h-4" size={16} />
      {t("share.cta")}
    </button>
  );
}