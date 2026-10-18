import type { Metadata } from "next";
import Link from "next/link";
import { LeanLoginForm } from "@/components/auth/LeanLoginForm";
import { LocaleCurrencyControls } from "@/components/platform/LocaleCurrencyControls";

export const metadata: Metadata = {
  title: "Entrar",
  description: "Entre com e-mail e senha, ou com um link de acesso.",
  robots: { index: false, follow: false },
};

function firstParam(value: string | string[] | undefined): string | null {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value[0] ?? null;
  return null;
}

export default async function EntrarPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const next = firstParam(params.next);
  const auth = firstParam(params.auth);

  return (
    <div className="lean-login-page">
      <div className="lean-login-top">
        <Link href="/" className="lean-login-brand">
          <span className="landing-brand-mark" aria-hidden="true">
            J
          </span>
          <strong>Jubilation</strong>
        </Link>
        <LocaleCurrencyControls />
      </div>
      <LeanLoginForm next={next} auth={auth} />
    </div>
  );
}
