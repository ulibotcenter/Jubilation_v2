"use client";

import { FileUp } from "lucide-react";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { IrpfImportWizard } from "@/components/portfolio/IrpfImportWizard";

export function ImportIrpfButton({
  className = "btn-secondary",
}: {
  className?: string;
}) {
  const { t } = useTranslation();
  return (
    <IrpfImportWizard
      trigger={
        <button type="button" className={className} data-irpf-cta="import">
          <FileUp className="w-4 h-4" size={16} />
          {t("dashboard.origins.cta.importIrpf")}
        </button>
      }
    />
  );
}
