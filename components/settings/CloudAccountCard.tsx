"use client";

import { useEffect, useState } from "react";
import { Cloud, CloudOff, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  BackupFormatError,
  BackupPasswordError,
  MIN_BACKUP_PASSWORD_LENGTH,
  buildBackupPlaintext,
  decryptBackup,
  encryptBackup,
  parseBackupEnvelope,
} from "@/lib/backup";
import { EmailUseModal } from "@/components/legal/EmailUseModal";
import { publicCloudStatus, type PublicCloudStatus } from "@/lib/cloud/config";
import { EMAIL_USE_LABEL } from "@/lib/legal/emailUse";
import { TERMS_PATH } from "@/lib/legal/terms";
import { COUNTRIES } from "@/lib/onboarding/country";
import { partializePersistedState } from "@/lib/persist/partialize";
import { useTranslation } from "@/lib/i18n/useTranslation";
import type { MessageKey } from "@/lib/i18n/messages";
import { tenantMayPersistOnHost } from "@/lib/region";
import { safeReturnPath } from "@/lib/cloud/returnPath";
import { useAppStore } from "@/store/useAppStore";
import type { Country } from "@/types";
import Link from "next/link";

interface Me {
  email: string;
  dataRegion: string;
}

export function CloudAccountCard() {
  const { t } = useTranslation();
  const restoreFromBackup = useAppStore((s) => s.restoreFromBackup);
  const [status, setStatus] = useState<PublicCloudStatus | null>(null);
  const [me, setMe] = useState<Me | null>(null);
  const [email, setEmail] = useState("");
  const [age, setAge] = useState("");
  const [country, setCountry] = useState<Country>("BR");
  const [emailUseOpen, setEmailUseOpen] = useState(false);
  const [accountPassword, setAccountPassword] = useState("");
  const [blobPassword, setBlobPassword] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/auth/status");
        const json = (await res.json()) as PublicCloudStatus;
        if (cancelled) return;
        setStatus(json);
        if (typeof window !== "undefined") {
          const auth = new URLSearchParams(window.location.search).get("auth");
          if (auth === "ok") toast.success(t("toast.cloud.loggedIn"));
        }
        if (!json.enabled) return;
        const meRes = await fetch("/api/auth/me");
        if (meRes.ok) {
          const body = (await meRes.json()) as Me;
          if (!cancelled) setMe(body);
        }
      } catch {
        if (!cancelled) {
          setStatus(publicCloudStatus({}));
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [t]);

  const handleLogin = async (mode: "login" | "register") => {
    if (!email.includes("@") || accountPassword.length < 10) {
      toast.error(t("toast.cloud.invalidInput"));
      return;
    }
    const lead = mode === "register" ? leadReady() : { email, age: Number(age) || 0, country };
    if (mode === "register" && !lead) return;
    setBusy(mode);
    try {
      const res = await fetch(
        mode === "login" ? "/api/auth/login" : "/api/auth/register",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            mode === "register"
              ? { email, password: accountPassword, age: lead?.age, country }
              : { email, password: accountPassword }
          ),
        }
      );
      const body = (await res.json()) as Me & { error?: string };
      if (!res.ok) {
        toast.error(t("toast.cloud.error"));
        return;
      }
      setMe({ email: body.email, dataRegion: body.dataRegion });
      setAccountPassword("");
      toast.success(t("toast.cloud.loggedIn"));
      const next = safeReturnPath(
        new URLSearchParams(window.location.search).get("next")
      );
      if (next) {
        window.location.assign(next);
        return;
      }
    } catch {
      toast.error(t("toast.cloud.error"));
    } finally {
      setBusy(null);
    }
  };

  const leadReady = () => {
    const parsedAge = Number(age);
    if (!email.includes("@") || !Number.isInteger(parsedAge) || parsedAge < 18 || parsedAge > 120) {
      toast.error(t("toast.cloud.invalidInput"));
      return null;
    }
    return { email, age: parsedAge, country };
  };

  const handleMagic = async () => {
    const lead = leadReady();
    if (!lead) return;
    setBusy("magic");
    try {
      const res = await fetch("/api/auth/magic-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(lead),
      });
      if (!res.ok) {
        toast.error(t("toast.cloud.error"));
        return;
      }
      toast.success(t("toast.cloud.magicSent"));
    } catch {
      toast.error(t("toast.cloud.error"));
    } finally {
      setBusy(null);
    }
  };

  const handleLogout = async () => {
    setBusy("logout");
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      setMe(null);
      toast.success(t("toast.cloud.loggedOut"));
    } finally {
      setBusy(null);
    }
  };

  const handleSyncUp = async () => {
    if (blobPassword.length < MIN_BACKUP_PASSWORD_LENGTH) {
      toast.error(
        t("toast.backup.passwordShort", { n: MIN_BACKUP_PASSWORD_LENGTH })
      );
      return;
    }
    const localTenant = useAppStore.getState().tenant;
    if (!tenantMayPersistOnHost(localTenant).ok) {
      toast.error(t("toast.cloud.regionBlocked"));
      return;
    }
    setBusy("up");
    try {
      const slice = partializePersistedState(useAppStore.getState());
      const plaintext = buildBackupPlaintext(slice as Record<string, unknown>);
      const envelope = await encryptBackup(plaintext, blobPassword);
      const res = await fetch("/api/vault", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(envelope),
      });
      if (!res.ok) {
        const fail = (await res.json().catch(() => ({}))) as { error?: string };
        toast.error(
          fail.error === "region_not_live" || fail.error === "region_host_mismatch"
            ? t("toast.cloud.regionBlocked")
            : t("toast.cloud.error")
        );
        return;
      }
      const body = (await res.json()) as { updatedAt?: string };
      setUpdatedAt(body.updatedAt ?? new Date().toISOString());
      toast.success(t("toast.cloud.syncedUp"));
    } catch {
      toast.error(t("toast.cloud.error"));
    } finally {
      setBusy(null);
    }
  };

  const handleSyncDown = async () => {
    if (blobPassword.length < MIN_BACKUP_PASSWORD_LENGTH) {
      toast.error(
        t("toast.backup.passwordShort", { n: MIN_BACKUP_PASSWORD_LENGTH })
      );
      return;
    }
    setBusy("down");
    try {
      const res = await fetch("/api/vault");
      if (!res.ok) {
        toast.error(t("toast.cloud.error"));
        return;
      }
      const body = (await res.json()) as { envelope: unknown };
      if (!body.envelope) {
        toast.error(t("toast.cloud.emptyVault"));
        return;
      }
      parseBackupEnvelope(body.envelope);
      const plaintext = await decryptBackup(body.envelope, blobPassword);
      if (!window.confirm(t("settings.backup.confirmRestore"))) return;
      restoreFromBackup(plaintext.state);
      toast.success(t("toast.cloud.syncedDown"));
    } catch (err) {
      if (err instanceof BackupPasswordError) {
        toast.error(t("toast.backup.wrongPassword"));
      } else if (err instanceof BackupFormatError) {
        toast.error(t("toast.backup.invalidFile"));
      } else {
        toast.error(t("toast.cloud.error"));
      }
    } finally {
      setBusy(null);
    }
  };

  const handleLeadWhileOffline = () => {
    if (!leadReady()) return;
    toast.error(t("settings.cloud.bodySoon"));
  };

  const loading = status === null;
  const enabled = Boolean(status?.enabled);

  const leadFields = (
    <>
      <label className="household-field mt-4">
        <span>{t("settings.cloud.email")}</span>
        <input
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </label>
      <label className="household-field mt-3">
        <span>{t("onboarding.field.age")}</span>
        <input
          type="number"
          min={18}
          max={120}
          inputMode="numeric"
          value={age}
          onChange={(e) => setAge(e.target.value)}
        />
      </label>
      <label className="household-field mt-3">
        <span>{t("onboarding.field.country")}</span>
        <select
          value={country}
          onChange={(e) => setCountry(e.target.value as Country)}
        >
          {COUNTRIES.map((option) => (
            <option key={option.code} value={option.code}>
              {t(`country.${option.code}` as MessageKey)}
            </option>
          ))}
        </select>
      </label>
      <button
        type="button"
        className="btn-ghost text-xs mt-3"
        data-email-use="open-button"
        onClick={() => setEmailUseOpen(true)}
      >
        {EMAIL_USE_LABEL}
      </button>
      <p className="text-[11px] text-muted-foreground mt-2">
        <Link href={TERMS_PATH} className="text-accent hover:underline">
          {t("footer.link.terms")}
        </Link>
      </p>
      <EmailUseModal open={emailUseOpen} onClose={() => setEmailUseOpen(false)} />
    </>
  );

  return (
    <section id="cloud-account" className="settings-page-card" data-login-entry="cloud">
      <div className="settings-page-card-head">
        {enabled ? (
          <Cloud className="w-4 h-4 text-accent" size={16} />
        ) : (
          <CloudOff className="w-4 h-4 text-accent" size={16} />
        )}
        <h2>{t("settings.cloud.title")}</h2>
      </div>
      {!me && (
        <p className="text-sm font-medium text-foreground">{t("settings.cloud.signInEntry")}</p>
      )}

      {loading && (
        <p className="settings-page-card-body flex items-center gap-2">
          <Loader2 className="w-3.5 h-3.5 animate-spin" size={14} />
          {t("settings.cloud.checking")}
        </p>
      )}

      {!loading && !enabled && (
        <>
          <p className="settings-soon-badge">{t("settings.cloud.soonBadge")}</p>
          <p className="settings-page-card-body mt-2">
            {t("settings.cloud.bodySoon")}
          </p>
          <p className="text-[11px] text-muted-foreground mt-2">
            {t("settings.cloud.region", { region: status?.dataRegion ?? "eu" })}
          </p>
          <p className="text-[11px] text-muted-foreground mt-1">
            {t("settings.cloud.regionNote")}
          </p>
          {leadFields}
          <button
            type="button"
            className="btn-secondary text-xs mt-4"
            onClick={handleLeadWhileOffline}
          >
            {t("settings.cloud.magicLink")}
          </button>
        </>
      )}

      {!loading && enabled && !me && (
        <>
          <p className="settings-page-card-body">{t("settings.cloud.bodyReady")}</p>
          <p className="text-[11px] text-muted-foreground mt-2">
            {t("settings.cloud.region", { region: status?.dataRegion ?? "eu" })}
          </p>
          <p className="text-[11px] text-muted-foreground mt-1">
            {t("settings.cloud.regionNote")}
          </p>
          {leadFields}
          {status?.password && (
            <label className="household-field mt-3">
              <span>{t("settings.cloud.password")}</span>
              <input
                type="password"
                autoComplete="current-password"
                value={accountPassword}
                onChange={(e) => setAccountPassword(e.target.value)}
              />
            </label>
          )}
          <div className="flex flex-wrap gap-2 mt-4">
            {status?.password && (
              <>
                <button
                  type="button"
                  className="btn-secondary text-xs"
                  disabled={busy !== null}
                  onClick={() => void handleLogin("login")}
                >
                  {t("settings.cloud.login")}
                </button>
                <button
                  type="button"
                  className="btn-ghost text-xs"
                  disabled={busy !== null}
                  onClick={() => void handleLogin("register")}
                >
                  {t("settings.cloud.register")}
                </button>
              </>
            )}
            {status?.magicLink && (
              <button
                type="button"
                className="btn-ghost text-xs"
                disabled={busy !== null}
                onClick={() => void handleMagic()}
              >
                {t("settings.cloud.magicLink")}
              </button>
            )}
          </div>
        </>
      )}

      {!loading && enabled && me && (
        <>
          <p className="settings-page-card-body font-medium text-foreground">
            {t("settings.cloud.signedIn", { email: me.email })}
          </p>
          <p className="text-[11px] text-muted-foreground mt-1">
            {t("settings.cloud.planSync")}
          </p>
          <p className="text-[11px] text-muted-foreground mt-1">
            {t("settings.cloud.region", { region: me.dataRegion })}
            {updatedAt
              ? ` · ${t("settings.cloud.updatedAt", { date: updatedAt.slice(0, 10) })}`
              : ""}
          </p>
          <p className="text-[11px] text-muted-foreground mt-1">
            {t("settings.cloud.regionNote")}
          </p>
          <p className="settings-page-card-body mt-3">
            {t("settings.cloud.backupPasswordHint")}
          </p>
          <label className="household-field mt-3">
            <span>{t("settings.cloud.blobPassword")}</span>
            <input
              type="password"
              autoComplete="off"
              value={blobPassword}
              onChange={(e) => setBlobPassword(e.target.value)}
            />
          </label>
          <div className="flex flex-wrap gap-2 mt-4">
            <button
              type="button"
              className="btn-secondary text-xs"
              disabled={busy !== null}
              onClick={() => void handleSyncUp()}
            >
              {busy === "up"
                ? t("settings.cloud.syncing")
                : t("settings.cloud.syncUp")}
            </button>
            <button
              type="button"
              className="btn-secondary text-xs"
              disabled={busy !== null}
              onClick={() => void handleSyncDown()}
            >
              {busy === "down"
                ? t("settings.cloud.syncing")
                : t("settings.cloud.syncDown")}
            </button>
            <button
              type="button"
              className="btn-ghost text-xs"
              disabled={busy !== null}
              onClick={() => void handleLogout()}
            >
              {t("settings.cloud.logout")}
            </button>
          </div>
        </>
      )}
    </section>
  );
}
