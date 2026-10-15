"use client";

import { EMAIL_USE_BODY, EMAIL_USE_LABEL } from "@/lib/legal/emailUse";

export function EmailUseModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  if (!open) return null;
  return (
    <div className="modal-overlay" role="presentation" onClick={onClose}>
      <div
        className="modal-content max-w-md"
        role="dialog"
        aria-modal="true"
        aria-labelledby="email-use-title"
        data-email-use="open"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-body px-5 py-6 sm:px-6 space-y-3">
          <h2 id="email-use-title" className="text-base font-bold">
            {EMAIL_USE_LABEL}
          </h2>
          <p className="text-sm text-muted-foreground" data-email-use="body">
            {EMAIL_USE_BODY}
          </p>
          <button type="button" className="btn-secondary text-sm" onClick={onClose}>
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
