import type { ReactNode } from "react";
import { PublicChrome } from "@/components/calculators/PublicChrome";

export default function CalculadorasLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <PublicChrome>{children}</PublicChrome>;
}
