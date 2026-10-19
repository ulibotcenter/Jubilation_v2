"use client";

import Link from "next/link";
import { toast } from "sonner";
import { kpisFromFreedomInput } from "@/lib/calculators/applyFreedomPlan";
import type { PublicIndependenceInput } from "@/lib/calculators/independence";
import { useCloudSignedIn } from "@/hooks/useCloudSignedIn";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { enablePersistWrites } from "@/lib/persist/storage";
import { DASHBOARD_PATH, PLANS_PATH, SIGN_IN_PATH } from "@/lib/routes";
import { useAppStore } from "@/store/useAppStore";

export function FreedomNextCta({
  input,
  inflationPercent,
  freedomAge,
}: {
  input: PublicIndependenceInput;
  inflationPercent: number;
  freedomAge: number | null;
}) {
  const { t } = useTranslation();
  const signedIn = useCloudSignedIn();

  const persistLocal = () => {
    enablePersistWrites();
    const state = useAppStore.getState();
    state.applyServerPlan({
      kpis: kpisFromFreedomInput(
        input,
        inflationPercent,
        freedomAge,
        state.kpis
      ),
    });
  };

  const saveAndOpenPainel = () => {
    persistLocal();
    toast.success(t("calc.freedom.nextSavedLocal"));
    window.location.assign(DASHBOARD_PATH);
  };

  return (
    <section
      className="public-cta public-cta--after-result"
      aria-label={t("calc.freedom.nextAria")}
      data-freedom-next-cta={signedIn ? "in" : "out"}
    >
      <h2>{t("calc.freedom.nextTitle")}</h2>
      {signedIn ? (
        <div className="public-cta-actions">
          <button
            type="button"
            className="btn-primary"
            data-freedom-next="save"
            onClick={saveAndOpenPainel}
          >
            {t("calc.freedom.nextSave")}
          </button>
        </div>
      ) : (
        <div className="public-cta-actions">
          <Link
            href={SIGN_IN_PATH}
            className="btn-primary"
            data-freedom-next="create"
            onClick={persistLocal}
          >
            {t("calc.freedom.nextCreate")}
          </Link>
          <Link
            href={PLANS_PATH}
            className="btn-secondary"
            data-freedom-next="plans"
          >
            {t("calc.freedom.nextPlans")}
          </Link>
        </div>
      )}
    </section>
  );
}
