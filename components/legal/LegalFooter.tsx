"use client";

import Link from "next/link";
import { PRIVACY_PATH } from "@/lib/privacy/local";
import { useTranslation } from "@/lib/i18n/useTranslation";

export function LegalFooter() {
  const { t } = useTranslation();

  return (
    <footer className="legal-footer">
      <p className="legal-footer-copy">{t("footer.disclaimer")}</p>
      <p className="legal-footer-links">
        <Link href={PRIVACY_PATH} className="text-accent hover:underline">
          {t("footer.link.privacy")}
        </Link>
        {" · "}
        <Link href="/cash-flow" className="text-accent hover:underline">
          {t("footer.link.cashflow")}
        </Link>
        {" · "}
        <Link href="/simulation" className="text-accent hover:underline">
          {t("footer.link.simulation")}
        </Link>
      </p>
    </footer>
  );
}
