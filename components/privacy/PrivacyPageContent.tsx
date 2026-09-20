"use client";

import { Shield } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/PageHeader";
import { downloadFile } from "@/lib/exportReport";
import { consentExportFilename, eraseLocalPlan } from "@/lib/privacy/local";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { useAppStore } from "@/store/useAppStore";

const SECTIONS = [
  { title: "privacy.collected.title", body: "privacy.collected.body" },
  { title: "privacy.notCollected.title", body: "privacy.notCollected.body" },
  { title: "privacy.basis.title", body: "privacy.basis.body" },
  { title: "privacy.hosting.title", body: "privacy.hosting.body" },
  { title: "privacy.spouse.title", body: "privacy.spouse.body" },
] as const;

export function PrivacyPageContent() {
  const { t } = useTranslation();
  const exportLog = useAppStore((s) => s.exportConsentLog);

  const handleExport = () => {
    downloadFile(
      exportLog(),
      consentExportFilename(),
      "application/json"
    );
    toast.success(t("toast.privacy.exported"));
  };

  const handleErase = () => {
    if (!window.confirm(t("privacy.erase.confirm"))) return;
    eraseLocalPlan();
    useAppStore.persist.clearStorage();
    window.location.assign("/");
  };

  return (
    <div className="secondary-page">
      <PageHeader
        icon={Shield}
        title={t("privacy.title")}
        description={t("privacy.pageDescription")}
      />

      <div className="settings-page-grid">
        {SECTIONS.map((section) => (
          <section
            key={section.title}
            className="settings-page-card settings-page-card--featured"
          >
            <div className="settings-page-card-head">
              <h2>{t(section.title)}</h2>
            </div>
            <p className="settings-page-card-body whitespace-pre-line">
              {t(section.body)}
            </p>
          </section>
        ))}

        <section className="settings-page-card">
          <div className="settings-page-card-head">
            <h2>{t("privacy.export.title")}</h2>
          </div>
          <p className="settings-page-card-body">{t("privacy.export.body")}</p>
          <button
            type="button"
            className="btn-secondary mt-4"
            onClick={handleExport}
          >
            {t("privacy.export.button")}
          </button>
        </section>

        <section className="settings-page-card">
          <div className="settings-page-card-head">
            <h2>{t("privacy.erase.title")}</h2>
          </div>
          <p className="settings-page-card-body">{t("privacy.erase.body")}</p>
          <button
            type="button"
            className="btn-secondary mt-4"
            onClick={handleErase}
          >
            {t("privacy.erase.button")}
          </button>
        </section>
      </div>
    </div>
  );
}
