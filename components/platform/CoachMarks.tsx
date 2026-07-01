"use client";

import { useAppStore } from "@/store/useAppStore";
import { useTranslation } from "@/lib/i18n/useTranslation";

export function CoachMarks() {
  const dismissed = useAppStore((s) => s.coachMarksDismissed);
  const dismiss = useAppStore((s) => s.dismissCoachMarks);
  const { t } = useTranslation();

  if (dismissed) return null;

  return (
    <div className="coach-marks" role="note">
      <p>{t("coach.welcome")}</p>
      <button type="button" className="btn-secondary text-xs" onClick={dismiss}>
        {t("coach.dismiss")}
      </button>
    </div>
  );
}