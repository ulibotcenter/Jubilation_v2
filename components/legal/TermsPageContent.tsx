import { FileText } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { PlainLegalCard } from "@/components/legal/PlainLegalCard";
import {
  TERMS_BODY,
  TERMS_PAGE_DESCRIPTION,
  TERMS_PAGE_TITLE,
  TERMS_TITLE,
} from "@/lib/legal/terms";

export function TermsPageContent() {
  return (
    <div className="secondary-page">
      <PageHeader
        icon={FileText}
        title={TERMS_PAGE_TITLE}
        description={TERMS_PAGE_DESCRIPTION}
      />
      <div className="settings-page-grid">
        <section className="settings-page-card settings-page-card--featured">
          <div className="settings-page-card-head">
            <h2>{TERMS_TITLE}</h2>
          </div>
          <p className="settings-page-card-body">{TERMS_BODY}</p>
        </section>
        <PlainLegalCard />
      </div>
    </div>
  );
}
