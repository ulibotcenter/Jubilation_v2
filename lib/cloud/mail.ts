import nodemailer from "nodemailer";
import { cloudAuthConfig, DEFAULT_RESEND_FROM } from "@/lib/cloud/config";

export const RESEND_FALLBACK_FROM = "Jubilation <onboarding@resend.dev>";

export type MagicLinkDelivery = {
  id: string;
  from: string;
  transport: "resend" | "smtp";
};

function magicLinkContent(url: string): { subject: string; text: string; html: string } {
  return {
    subject: "Seu acesso ao Jubilation",
    text: `Abra este link para entrar (vale ${20} minutos):\n\n${url}\n\nSe você não pediu, ignore este e-mail.`,
    html: `<p>Abra este link para entrar (vale 20 minutos):</p><p><a href="${url}">${url}</a></p><p>Se você não pediu, ignore este e-mail.</p>`,
  };
}

function isUnverifiedDomainError(status: number, message: string): boolean {
  if (status !== 400 && status !== 403 && status !== 422) return false;
  const lower = message.toLowerCase();
  return (
    lower.includes("not verified") ||
    lower.includes("unverified") ||
    lower.includes("domain is not") ||
    (lower.includes("domain") && lower.includes("verify")) ||
    lower.includes("invalid `from`") ||
    lower.includes("from address")
  );
}

function fromAddress(value: string): string {
  const match = value.match(/<([^>]+)>/);
  return (match?.[1] ?? value).trim().toLowerCase();
}

function usesResendOnboarding(from: string): boolean {
  return fromAddress(from).endsWith("@resend.dev");
}

async function postResendEmail(input: {
  apiKey: string;
  from: string;
  to: string;
  url: string;
}): Promise<
  | { ok: true; id: string; from: string }
  | { ok: false; status: number; domainRejected: boolean }
> {
  const content = magicLinkContent(input.url);
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${input.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: input.from,
      to: [input.to],
      subject: content.subject,
      text: content.text,
      html: content.html,
    }),
  });
  const body = (await res.json().catch(() => null)) as {
    id?: unknown;
    message?: unknown;
    name?: unknown;
  } | null;
  if (res.ok && body && typeof body.id === "string" && body.id.length > 0) {
    return { ok: true, id: body.id, from: input.from };
  }
  const message = typeof body?.message === "string" ? body.message : "";
  return {
    ok: false,
    status: res.status,
    domainRejected: isUnverifiedDomainError(res.status, message),
  };
}

async function sendViaResend(input: {
  apiKey: string;
  from: string;
  to: string;
  url: string;
}): Promise<MagicLinkDelivery> {
  const preferred = input.from || DEFAULT_RESEND_FROM;
  const first = await postResendEmail({ ...input, from: preferred });
  if (first.ok) {
    return { id: first.id, from: first.from, transport: "resend" };
  }
  if (first.domainRejected && !usesResendOnboarding(preferred)) {
    const fallback = await postResendEmail({
      ...input,
      from: RESEND_FALLBACK_FROM,
    });
    if (fallback.ok) {
      return { id: fallback.id, from: fallback.from, transport: "resend" };
    }
    throw new Error(`resend_failed_${fallback.status}`);
  }
  throw new Error(`resend_failed_${first.status}`);
}

async function sendViaSmtp(input: {
  to: string;
  url: string;
  smtpHost: string;
  smtpPort: number;
  smtpSecure: boolean;
  smtpUser: string;
  smtpPass: string;
  emailFrom: string;
}): Promise<MagicLinkDelivery> {
  const content = magicLinkContent(input.url);
  const transporter = nodemailer.createTransport({
    host: input.smtpHost,
    port: input.smtpPort,
    secure: input.smtpSecure,
    auth:
      input.smtpUser || input.smtpPass
        ? { user: input.smtpUser, pass: input.smtpPass }
        : undefined,
  });
  const info = await transporter.sendMail({
    from: input.emailFrom,
    to: input.to,
    subject: content.subject,
    text: content.text,
    html: content.html,
  });
  return {
    id: typeof info.messageId === "string" ? info.messageId : "smtp",
    from: input.emailFrom,
    transport: "smtp",
  };
}

export async function deliverMagicLinkEmail(
  input: {
    to: string;
    url: string;
  },
  env?: Record<string, string | undefined>
): Promise<MagicLinkDelivery> {
  const cfg = cloudAuthConfig(env);
  if (!cfg.magicLink) {
    throw new Error("magic_link_disabled");
  }
  if (cfg.resendApiKey) {
    const delivered = await sendViaResend({
      apiKey: cfg.resendApiKey,
      from: cfg.emailFrom,
      to: input.to,
      url: input.url,
    });
    console.info("magic-link email accepted", {
      id: delivered.id,
      from: delivered.from,
      transport: delivered.transport,
    });
    return delivered;
  }
  return sendViaSmtp({
    to: input.to,
    url: input.url,
    smtpHost: cfg.smtpHost,
    smtpPort: cfg.smtpPort,
    smtpSecure: cfg.smtpSecure,
    smtpUser: cfg.smtpUser,
    smtpPass: cfg.smtpPass,
    emailFrom: cfg.emailFrom,
  });
}

export async function sendMagicLinkEmail(input: {
  to: string;
  url: string;
}): Promise<void> {
  await deliverMagicLinkEmail(input);
}
