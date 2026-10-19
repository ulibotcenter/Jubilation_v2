import Link from "next/link";
import { PUBLIC_DISCLAIMER_SHORT, PUBLIC_DISCLAIMER_LONG } from "@/lib/calculators/copy";

export function DisclaimerBlock({ variant = "short" }: { variant?: "short" | "long" }) {
  const text = variant === "long" ? PUBLIC_DISCLAIMER_LONG : PUBLIC_DISCLAIMER_SHORT;
  return (
    <aside className="public-disclaimer" aria-label="Aviso legal">
      {text.split("\n\n").map((paragraph) => (
        <p key={paragraph.slice(0, 24)}>{paragraph}</p>
      ))}
    </aside>
  );
}

export function AppCta({
  extra,
  title = "Quer guardar o plano?",
  primaryLabel = "Ver Básico e Completo",
  secondaryLabel = "Criar conta",
  ariaLabel = "Continuar no app",
  primaryHref = "/planos",
  secondaryHref = "/settings#cloud-account",
}: {
  extra?: string;
  title?: string;
  primaryLabel?: string;
  secondaryLabel?: string;
  ariaLabel?: string;
  primaryHref?: string;
  secondaryHref?: string;
}) {
  return (
    <section className="public-cta" aria-label={ariaLabel}>
      <h2>{title}</h2>
      <p>
        {extra ??
          "A calculadora pública para neste número. O gráfico, os campos manuais e os três blocos começam no Básico."}
      </p>
      <div className="flex flex-wrap gap-2">
        <Link href={primaryHref} className="btn-primary">
          {primaryLabel}
        </Link>
        <Link href={secondaryHref} className="btn-secondary">
          {secondaryLabel}
        </Link>
      </div>
    </section>
  );
}
