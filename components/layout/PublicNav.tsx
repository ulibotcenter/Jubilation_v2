"use client";

import Link from "next/link";
import { CALCULATOR_PATHS } from "@/lib/calculators/seo";
import { useCloudSignedIn } from "@/hooks/useCloudSignedIn";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { DASHBOARD_PATH, PLANS_PATH, SIGN_IN_PATH } from "@/lib/routes";

export function PublicNav({ className }: { className?: string }) {
  const { t } = useTranslation();
  const signedIn = useCloudSignedIn();

  return (
    <nav className={className} aria-label={t("landing.nav.aria")}>
      <Link href={CALCULATOR_PATHS.freedomDate} data-nav="calculadora">
        {t("landing.nav.calculator")}
      </Link>
      <Link href={PLANS_PATH} data-nav="planos">
        {t("nav.upgrade")}
      </Link>
      {signedIn ? (
        <Link href={DASHBOARD_PATH} data-nav="painel">
          {t("nav.dashboard")}
        </Link>
      ) : (
        <Link href={SIGN_IN_PATH} data-nav="entrar">
          {t("nav.signIn")}
        </Link>
      )}
    </nav>
  );
}
