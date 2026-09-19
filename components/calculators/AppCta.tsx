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
      <h2>Quer o plano completo?</h2>
      <p>
        {extra ??
          "O diagnóstico no app é grátis e fica neste aparelho. Sem cadastro, sem paywall no número."}
      </p>
      <Link href="/" className="btn-primary">
        Abrir meu plano
      </Link>
    </section>
  );
}
