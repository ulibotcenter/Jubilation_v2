"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { publicCloudStatus, type PublicCloudStatus } from "@/lib/cloud/config";
import {
  isValidAccountEmail,
  passwordMeetsAccountMinimum,
} from "@/lib/cloud/magicLinkForm";
import {
  postLoginDestination,
  safeReturnPath,
} from "@/lib/cloud/returnPath";
import { useTranslation } from "@/lib/i18n/useTranslation";
import type { MessageKey } from "@/lib/i18n/messages";

const AUTH_ERROR_KEYS: Record<string, MessageKey> = {
  missing: "login.auth.missing",
  expired: "login.auth.expired",
  region: "login.auth.region",
};

export function LeanLoginForm({
  next,
  auth,
}: {
  next: string | null;
  auth: string | null;
}) {
  const { t } = useTranslation();
  const [status, setStatus] = useState<PublicCloudStatus | null>(null);
  const [ready, setReady] = useState(false);
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [busy, setBusy] = useState<"login" | "register" | "magic" | null>(null);
  const returnPath = safeReturnPath(next);

  useEffect(() => {
    const key = auth ? AUTH_ERROR_KEYS[auth] : undefined;
    if (key) toast.error(t(key));
  }, [auth, t]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      let leaving = false;
      try {
        const [statusRes, meRes] = await Promise.all([
          fetch("/api/auth/status", { cache: "no-store" }),
          fetch("/api/auth/me", { cache: "no-store" }),
        ]);
        if (cancelled) return;
        if (meRes.ok) {
          leaving = true;
          window.location.assign(postLoginDestination(next));
          return;
        }
        const json = (await statusRes.json()) as PublicCloudStatus;
        if (!cancelled) setStatus(json);
      } catch {
        if (!cancelled) setStatus(publicCloudStatus({}));
      } finally {
        if (!cancelled && !leaving) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [next]);

  const destination = () => {
    window.location.assign(postLoginDestination(next));
  };

  const handleLogin = async () => {
    if (!isValidAccountEmail(email) || !passwordMeetsAccountMinimum(password)) {
      toast.error(t("toast.cloud.invalidInput"));
      return;
    }
    setBusy("login");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      if (!res.ok) {
        toast.error(t("toast.cloud.error"));
        return;
      }
      toast.success(t("toast.cloud.loggedIn"));
      destination();
    } catch {
      toast.error(t("toast.cloud.error"));
    } finally {
      setBusy(null);
    }
  };

  const handleRegister = async () => {
    if (!isValidAccountEmail(email) || !passwordMeetsAccountMinimum(password)) {
      toast.error(t("toast.cloud.invalidInput"));
      return;
    }
    if (password !== passwordConfirm) {
      toast.error(t("toast.cloud.passwordMismatch"));
      return;
    }
    setBusy("register");
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          returnPath
            ? {
                email: email.trim(),
                password,
                passwordConfirm,
                next: returnPath,
              }
            : { email: email.trim(), password, passwordConfirm }
        ),
      });
      if (!res.ok) {
        toast.error(t("toast.cloud.error"));
        return;
      }
      toast.success(t("toast.cloud.confirmSent"));
    } catch {
      toast.error(t("toast.cloud.error"));
    } finally {
      setBusy(null);
    }
  };

  const handleMagic = async () => {
    if (!isValidAccountEmail(email)) {
      toast.error(t("toast.cloud.invalidEmail"));
      return;
    }
    setBusy("magic");
    try {
      const res = await fetch("/api/auth/magic-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          returnPath
            ? { email: email.trim(), next: returnPath }
            : { email: email.trim() }
        ),
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

  const enabled = Boolean(status?.enabled);
  const showPassword = Boolean(status?.password);
  const showMagic = Boolean(status?.magicLink);
  const isSignup = mode === "signup";

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (isSignup && showPassword) {
      void handleRegister();
      return;
    }
    if (showPassword) {
      void handleLogin();
      return;
    }
    if (showMagic) void handleMagic();
  };

  return (
    <section
      className="card-surface lean-login-card"
      data-lean-login={ready ? "ready" : "loading"}
      data-login-mode={mode}
      data-login-password={showPassword ? "on" : "off"}
      data-login-magic={showMagic ? "on" : "off"}
    >
      <h1>{isSignup ? t("settings.cloud.register") : t("nav.signIn")}</h1>
      <p className="lean-login-lead">
        {isSignup ? t("login.signupLead") : t("login.lead")}
      </p>

      {!ready && (
        <p className="lean-login-status">
          <Loader2 className="w-3.5 h-3.5 animate-spin" size={14} />
          {t("settings.cloud.checking")}
        </p>
      )}

      {ready && !enabled && (
        <>
          <p className="settings-soon-badge">{t("settings.cloud.soonBadge")}</p>
          <p className="lean-login-lead">{t("settings.cloud.bodySoon")}</p>
        </>
      )}

      {ready && enabled && (
        <form className="lean-login-form" onSubmit={onSubmit}>
          <label className="household-field" htmlFor="lean-login-email">
            <span>{t("settings.cloud.email")}</span>
            <input
              id="lean-login-email"
              name="email"
              type="email"
              autoComplete="email"
              inputMode="email"
              value={email}
              data-login-field="email"
              onChange={(event) => setEmail(event.target.value)}
            />
          </label>
          {showPassword && (
            <label className="household-field" htmlFor="lean-login-password">
              <span>{t("settings.cloud.password")}</span>
              <input
                id="lean-login-password"
                name="password"
                type="password"
                autoComplete={isSignup ? "new-password" : "current-password"}
                value={password}
                data-login-field="password"
                onChange={(event) => setPassword(event.target.value)}
              />
            </label>
          )}
          {showPassword && isSignup && (
            <label className="household-field" htmlFor="lean-login-password-confirm">
              <span>{t("settings.cloud.passwordConfirm")}</span>
              <input
                id="lean-login-password-confirm"
                name="passwordConfirm"
                type="password"
                autoComplete="new-password"
                value={passwordConfirm}
                data-login-field="confirm-password"
                onChange={(event) => setPasswordConfirm(event.target.value)}
              />
            </label>
          )}
          <div className="lean-login-actions">
            {showPassword && (
              <button
                type="submit"
                className="btn-primary"
                data-login-action={isSignup ? "register" : "password"}
                disabled={busy !== null}
              >
                {busy === "login" || busy === "register"
                  ? t("settings.cloud.syncing")
                  : isSignup
                    ? t("settings.cloud.register")
                    : t("settings.cloud.login")}
              </button>
            )}
            {showMagic && (
              <button
                type="button"
                className="btn-secondary"
                data-login-action="magic-link"
                disabled={busy !== null}
                onClick={() => void handleMagic()}
              >
                {busy === "magic"
                  ? t("settings.cloud.syncing")
                  : t("settings.cloud.magicLink")}
              </button>
            )}
          </div>
          {showPassword && (
            <button
              type="button"
              className="lean-login-switch"
              data-login-switch={isSignup ? "signin" : "signup"}
              disabled={busy !== null}
              onClick={() => setMode(isSignup ? "signin" : "signup")}
            >
              {isSignup
                ? t("landing.cta.haveAccount")
                : t("settings.cloud.register")}
            </button>
          )}
        </form>
      )}
    </section>
  );
}
