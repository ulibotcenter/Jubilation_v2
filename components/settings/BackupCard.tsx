"use client";

import { useRef, useState } from "react";
import { Download, Loader2, Lock, Upload } from "lucide-react";
import { toast } from "sonner";
import {
  BackupFormatError,
  BackupPasswordError,
  MIN_BACKUP_PASSWORD_LENGTH,
  buildBackupPlaintext,
  decryptBackup,
  encryptBackup,
} from "@/lib/backup";
import { partializePersistedState } from "@/lib/persist/partialize";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { useAppStore } from "@/store/useAppStore";

function downloadJson(filename: string, value: unknown) {
  const blob = new Blob([JSON.stringify(value, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function BackupCard() {
  const { t } = useTranslation();
  const restoreFromBackup = useAppStore((s) => s.restoreFromBackup);
  const fileInput = useRef<HTMLInputElement>(null);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [restorePassword, setRestorePassword] = useState("");
  const [busy, setBusy] = useState<"export" | "restore" | null>(null);

  const handleExport = async () => {
    if (password.length < MIN_BACKUP_PASSWORD_LENGTH) {
      toast.error(t("toast.backup.passwordShort", { n: MIN_BACKUP_PASSWORD_LENGTH }));
      return;
    }
    if (password !== confirm) {
      toast.error(t("toast.backup.passwordMismatch"));
      return;
    }
    setBusy("export");
    try {
      const slice = partializePersistedState(useAppStore.getState());
      const plaintext = buildBackupPlaintext(slice as Record<string, unknown>);
      const envelope = await encryptBackup(plaintext, password);
      const stamp = new Date().toISOString().slice(0, 10);
      downloadJson(`jubilation-backup-${stamp}.json`, envelope);
      setPassword("");
      setConfirm("");
      toast.success(t("toast.backup.exported"));
    } catch (err) {
      toast.error(t("toast.backup.error"), {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setBusy(null);
    }
  };

  const handleRestoreFile = async (file: File) => {
    if (restorePassword.length < MIN_BACKUP_PASSWORD_LENGTH) {
      toast.error(t("toast.backup.passwordShort", { n: MIN_BACKUP_PASSWORD_LENGTH }));
      return;
    }
    setBusy("restore");
    try {
      const text = await file.text();
      const json = JSON.parse(text) as unknown;
      const plaintext = await decryptBackup(json, restorePassword);
      if (!window.confirm(t("settings.backup.confirmRestore"))) {
        return;
      }
      restoreFromBackup(plaintext.state);
      setRestorePassword("");
      toast.success(t("toast.backup.restored"));
    } catch (err) {
      if (err instanceof BackupPasswordError) {
        toast.error(t("toast.backup.wrongPassword"));
      } else if (err instanceof BackupFormatError || err instanceof SyntaxError) {
        toast.error(t("toast.backup.invalidFile"));
      } else {
        toast.error(t("toast.backup.error"));
      }
    } finally {
      setBusy(null);
      if (fileInput.current) fileInput.current.value = "";
    }
  };

  return (
    <section className="settings-page-card settings-page-card--featured">
      <div className="settings-page-card-head">
        <Lock className="w-4 h-4 text-accent" size={16} />
        <h2>{t("settings.backup.title")}</h2>
      </div>
      <p className="settings-page-card-body">{t("settings.backup.body")}</p>
      <p className="settings-backup-warning">{t("settings.backup.warning")}</p>

      <div className="settings-backup-grid">
        <div>
          <p className="settings-backup-label">{t("settings.backup.exportLabel")}</p>
          <label className="household-field">
            <span>{t("settings.backup.password")}</span>
            <input
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          <label className="household-field mt-3">
            <span>{t("settings.backup.passwordConfirm")}</span>
            <input
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
          </label>
          <button
            type="button"
            className="btn-secondary gap-1.5 mt-4"
            onClick={() => void handleExport()}
            disabled={busy !== null}
          >
            {busy === "export" ? (
              <Loader2 className="w-4 h-4 animate-spin" size={16} />
            ) : (
              <Download className="w-4 h-4" size={16} />
            )}
            {busy === "export"
              ? t("settings.backup.exporting")
              : t("settings.backup.export")}
          </button>
        </div>

        <div>
          <p className="settings-backup-label">{t("settings.backup.restoreLabel")}</p>
          <label className="household-field">
            <span>{t("settings.backup.restorePassword")}</span>
            <input
              type="password"
              autoComplete="off"
              value={restorePassword}
              onChange={(e) => setRestorePassword(e.target.value)}
            />
          </label>
          <input
            ref={fileInput}
            type="file"
            accept="application/json,.json"
            className="sr-only"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleRestoreFile(file);
            }}
          />
          <button
            type="button"
            className="btn-secondary gap-1.5 mt-4"
            onClick={() => fileInput.current?.click()}
            disabled={busy !== null}
          >
            {busy === "restore" ? (
              <Loader2 className="w-4 h-4 animate-spin" size={16} />
            ) : (
              <Upload className="w-4 h-4" size={16} />
            )}
            {busy === "restore"
              ? t("settings.backup.restoring")
              : t("settings.backup.restore")}
          </button>
        </div>
      </div>
    </section>
  );
}
