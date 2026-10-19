"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useCloudSignedIn } from "@/hooks/useCloudSignedIn";
import { freedomInputsToKpis } from "@/lib/calculators/applyFreedomPlan";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { DASHBOARD_PATH, PLANS_PATH, SIGN_IN_PATH } from "@/lib/routes";
import { useAppStore } from "@/store/useAppStore";
import type { KPIField } from "@/types";

export function FreedomNextStepCta({
  currentAge,
  liquidWealth,
  monthlyContribution,
  monthlySpending,
  lifeExpectancy,
  inflationPercent,
  freedomAge,
}: {
  currentAge: number;
  liquidWealth: number;
  monthlyContribution: number;
  monthlySpending: number;
  lifeExpectancy: number;
  inflationPercent: number;
  freedomAge: number | null;
}) {
  const { t } = useTranslation();
  const signedIn = useCloudSignedIn();
  const router = useRouter();
  const setKPI = useAppStore((s) => s.setKPI);

  const applyLocalPlan = () => {
    const patch = freedomInputsToKpis({
      currentAge,
      liquidWealth,
      monthlyContribution,
      monthlySpending,
      lifeExpectancy,
      inflationPercent,
      freedomAge,
    });
    for (const [field, value] of Object.entries(patch)) {
      if (typeof value === "number") setKPI(field as KPIField, value);
    }
  };

  const saveLocalAndOpenPainel = () => {
    applyLocalPlan();
    toast(t("calc.freedom.next.saveConfirm"));
    router.push(DASHBOARD_PATH);
  };

  return (
    <section
      id="freedom-next-cta"
      className="public-cta public-cta--next"
      data-freedom-next={signedIn ? "in" : "out"}
      aria-label={t("calc.freedom.next.aria")}
    >
      <h2>{t("calc.freedom.next.title")}</h2>
      {signedIn ? (
        <button
          type="button"
          className="btn-primary"
          data-freedom-cta="save"
          onClick={saveLocalAndOpenPainel}
        >
          {t("calc.freedom.next.save")}
        </button>
      ) : (
        <div className="flex flex-wrap gap-2">
          <Link
            href={SIGN_IN_PATH}
            className="btn-primary"
            data-freedom-cta="create"
            onClick={applyLocalPlan}
          >
            {t("calc.freedom.next.create")}
          </Link>
          <Link
            href={PLANS_PATH}
            className="btn-secondary"
            data-freedom-cta="plans"
          >
            {t("calc.freedom.next.plans")}
          </Link>
        </div>
      )}
    </section>
  );
}
