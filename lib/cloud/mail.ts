import nodemailer from "nodemailer";
import { cloudAuthConfig } from "@/lib/cloud/config";

export async function sendMagicLinkEmail(input: {
  to: string;
  url: string;
}): Promise<void> {
  const cfg = cloudAuthConfig();
  if (!cfg.magicLink) {
    throw new Error("magic_link_disabled");
  }
  const transporter = nodemailer.createTransport({
    host: cfg.smtpHost,
    port: cfg.smtpPort,
    secure: cfg.smtpSecure,
    auth:
      cfg.smtpUser || cfg.smtpPass
        ? { user: cfg.smtpUser, pass: cfg.smtpPass }
        : undefined,
  });
  await transporter.sendMail({
    from: cfg.emailFrom,
    to: input.to,
    subject: "Seu acesso ao Jubilation",
    text: `Abra este link para entrar (vale ${20} minutos):\n\n${input.url}\n\nSe você não pediu, ignore este e-mail.`,
    html: `<p>Abra este link para entrar (vale 20 minutos):</p><p><a href="${input.url}">${input.url}</a></p><p>Se você não pediu, ignore este e-mail.</p>`,
  });
}
