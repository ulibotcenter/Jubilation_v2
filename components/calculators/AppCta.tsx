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
}: {
  extra?: string;
}) {
  return (
    <section className="public-cta" aria-label="Continuar no app">
      <h2>Quer guardar o plano?</h2>
      <p>
        {extra ??
          "A calculadora pública para neste número. O gráfico, os campos manuais e os três blocos começam no Básico."}
      </p>
      <div className="flex flex-wrap gap-2">
        <Link href="/planos" className="btn-primary">
          Ver Básico e Completo
        </Link>
        <Link href="/settings#cloud-account" className="btn-secondary">
          Criar conta
        </Link>
      </div>
    </section>
  );
}
