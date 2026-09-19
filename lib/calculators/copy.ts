import { PT } from "@/lib/i18n/catalog/pt";
import { ENGINE_VERSION, PARAMETER_SET_VERSION } from "@/lib/engine/version";
import { DEFAULT_LIFE_EXPECTANCY_AGE } from "@/lib/engine/assumptions";

export const PUBLIC_DISCLAIMER_SHORT = PT["disclaimer.persistent"];
export const PUBLIC_DISCLAIMER_FOOTER = PT["footer.disclaimer"];
export const PUBLIC_DISCLAIMER_LONG = PT["onboarding.disclaimer"];

export const PUBLIC_ENGINE_NOTE = `Motor Jubilation ${ENGINE_VERSION} · parâmetros legais ${PARAMETER_SET_VERSION} · idade-alvo padrão ${DEFAULT_LIFE_EXPECTANCY_AGE}.`;

export const INSS_NOT_OFFICIAL =
  "Isto não é o Meu INSS, não substitui o simulador oficial do INSS e não consulta a base do governo. Não pedimos senha do gov.br. É uma simulação educativa com o mesmo motor do app, a partir dos números que você digita.";
