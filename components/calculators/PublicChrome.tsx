"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { PublicNav } from "@/components/layout/PublicNav";
import { LocaleCurrencyControls } from "@/components/platform/LocaleCurrencyControls";
import { CALCULATOR_PATHS } from "@/lib/calculators/seo";
import { PUBLIC_ENGINE_NOTE } from "@/lib/calculators/copy";
import { TERMS_PATH } from "@/lib/legal/terms";
import { PRIVACY_PATH } from "@/lib/privacy/local";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { PLANS_PATH, SIGN_IN_PATH } from "@/lib/routes";

export function PublicChrome({ children }: { children: ReactNode }) {
  const { t } = useTranslation();

  return (
    <div className="public-page">
      <header className="public-header">
        <Link href={CALCULATOR_PATHS.index} className="public-brand">
          <span className="public-brand-mark" aria-hidden="true">
            J
          </span>
          <span className="public-brand-text">
            <strong>Jubilation</strong>
            <span>{t("public.brand.subtitle")}</span>
          </span>
        </Link>
        <PublicNav className="public-nav" />
        <div className="public-header-tools">
          <LocaleCurrencyControls />
        </div>
      </header>
      <main className="public-main">{children}</main>
      <footer className="public-footer">
        <p>{t("footer.disclaimer")}</p>
        <p className="public-footer-meta">{PUBLIC_ENGINE_NOTE}</p>
        <p className="public-footer-links">
          <Link href={CALCULATOR_PATHS.index}>{t("landing.nav.calculators")}</Link>
          {" · "}
          <Link href={PRIVACY_PATH}>{t("footer.link.privacy")}</Link>
          {" · "}
          <Link href={TERMS_PATH}>{t("footer.link.terms")}</Link>
          {" · "}
          <Link href={PLANS_PATH}>{t("nav.upgrade")}</Link>
          {" · "}
          <Link href={SIGN_IN_PATH}>{t("nav.signIn")}</Link>
        </p>
      </footer>
    </div>
  );
}
