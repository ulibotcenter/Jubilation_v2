import Link from "next/link";
import type { ReactNode } from "react";
import { CALCULATOR_PATHS } from "@/lib/calculators/seo";
import {
  PUBLIC_DISCLAIMER_FOOTER,
  PUBLIC_ENGINE_NOTE,
} from "@/lib/calculators/copy";
import { PRIVACY_PATH } from "@/lib/privacy/local";

export function PublicChrome({ children }: { children: ReactNode }) {
  return (
    <div className="public-page">
      <script
        dangerouslySetInnerHTML={{
          __html: "document.documentElement.lang='pt-BR';",
        }}
      />
      <header className="public-header">
        <Link href={CALCULATOR_PATHS.index} className="public-brand">
          <span className="public-brand-mark" aria-hidden="true">
            J
          </span>
          <span className="public-brand-text">
            <strong>Jubilation</strong>
            <span>Calculadoras públicas</span>
          </span>
        </Link>
        <Link href="/" className="btn-primary public-header-cta">
          Abrir o app
        </Link>
      </header>
      <main className="public-main">{children}</main>
      <footer className="public-footer">
        <p>{PUBLIC_DISCLAIMER_FOOTER}</p>
        <p className="public-footer-meta">{PUBLIC_ENGINE_NOTE}</p>
        <p className="public-footer-links">
          <Link href={CALCULATOR_PATHS.index}>Calculadoras</Link>
          {" · "}
          <Link href={PRIVACY_PATH}>O que é guardado</Link>
          {" · "}
          <Link href="/">App — diagnóstico grátis, sem cadastro</Link>
        </p>
      </footer>
    </div>
  );
}
