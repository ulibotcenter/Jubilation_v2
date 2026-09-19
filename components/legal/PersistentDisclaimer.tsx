"use client";

import { useTranslation } from "@/lib/i18n/useTranslation";

export function PersistentDisclaimer({
  className = "persistent-disclaimer",
}: {
  className?: string;
}) {
  const { t } = useTranslation();
  return <p className={className}>{t("disclaimer.persistent")}</p>;
}
