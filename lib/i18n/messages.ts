export type AppLocale = "en" | "pt" | "es";

export type MessageKey =
  | "app.name"
  | "nav.dashboard"
  | "nav.portfolio"
  | "nav.simulation"
  | "nav.cashflow"
  | "nav.settings"
  | "nav.help"
  | "nav.upgrade"
  | "kpi.assumptions"
  | "kpi.clickEdit"
  | "kpi.sandboxEdit"
  | "plan.free"
  | "plan.premium"
  | "plan.horizon"
  | "feature.premium"
  | "feature.horizon"
  | "coach.welcome"
  | "coach.kpi"
  | "coach.simulation"
  | "explain.simple"
  | "explain.standard"
  | "theme.dark"
  | "theme.light"
  | "share.title"
  | "share.cta"
  | "ai.title"
  | "ai.placeholder"
  | "fi.coast"
  | "fi.barista"
  | "fi.traditional"
  | "needle.title"
  | "presentation.on"
  | "presentation.off";

type Catalog = Record<MessageKey, string>;

const EN: Catalog = {
  "app.name": "Jubilation",
  "nav.dashboard": "Dashboard",
  "nav.portfolio": "Portfolio",
  "nav.simulation": "Simulation",
  "nav.cashflow": "Cash Flow",
  "nav.settings": "Settings",
  "nav.help": "Help",
  "nav.upgrade": "Plans",
  "kpi.assumptions": "Key Assumptions",
  "kpi.clickEdit": "Click any value to edit",
  "kpi.sandboxEdit": "Sandbox only — click to edit assumptions",
  "plan.free": "Free",
  "plan.premium": "Premium",
  "plan.horizon": "Horizon",
  "feature.premium": "Available on Premium",
  "feature.horizon": "Available on Horizon",
  "coach.welcome": "Welcome — set your assumptions, then open Simulation to experiment safely.",
  "coach.kpi": "These numbers drive every projection. Tap to edit.",
  "coach.simulation": "Sandbox never changes your real portfolio.",
  "explain.simple": "Simple language",
  "explain.standard": "Standard language",
  "theme.dark": "Dark",
  "theme.light": "Light",
  "share.title": "Share your progress",
  "share.cta": "Copy snapshot for social",
  "ai.title": "Retirement coach",
  "ai.placeholder": "Ask about your plan…",
  "fi.coast": "Coast FI",
  "fi.barista": "Barista FIRE",
  "fi.traditional": "Traditional FI",
  "needle.title": "What moved the needle",
  "presentation.on": "Presentation mode",
  "presentation.off": "Exit presentation",
};

const PT: Catalog = {
  ...EN,
  "nav.dashboard": "Painel",
  "nav.portfolio": "Portfólio",
  "nav.simulation": "Simulação",
  "nav.cashflow": "Fluxo de caixa",
  "nav.settings": "Configurações",
  "nav.help": "Ajuda",
  "nav.upgrade": "Planos",
  "kpi.assumptions": "Premissas principais",
  "kpi.clickEdit": "Clique para editar",
  "kpi.sandboxEdit": "Sandbox — clique para editar premissas",
  "plan.free": "Grátis",
  "plan.premium": "Premium",
  "plan.horizon": "Horizon",
  "feature.premium": "Disponível no Premium",
  "feature.horizon": "Disponível no Horizon",
  "coach.welcome": "Bem-vindo — defina suas premissas e use a Simulação para testar cenários.",
  "coach.kpi": "Estes números alimentam todas as projeções. Toque para editar.",
  "coach.simulation": "O sandbox não altera seu portfólio real.",
  "explain.simple": "Linguagem simples",
  "explain.standard": "Linguagem padrão",
  "share.title": "Compartilhe seu progresso",
  "share.cta": "Copiar resumo para redes",
  "ai.title": "Coach de aposentadoria",
  "ai.placeholder": "Pergunte sobre seu plano…",
  "fi.coast": "Coast FI",
  "fi.barista": "Barista FIRE",
  "fi.traditional": "FI tradicional",
  "needle.title": "O que mudou no plano",
  "presentation.on": "Modo apresentação",
  "presentation.off": "Sair da apresentação",
};

const ES: Catalog = {
  ...EN,
  "nav.dashboard": "Panel",
  "nav.portfolio": "Cartera",
  "nav.simulation": "Simulación",
  "nav.cashflow": "Flujo de caja",
  "nav.settings": "Ajustes",
  "nav.help": "Ayuda",
  "nav.upgrade": "Planes",
  "kpi.assumptions": "Supuestos clave",
  "kpi.clickEdit": "Clic para editar",
  "kpi.sandboxEdit": "Sandbox — edita supuestos aquí",
  "plan.free": "Gratis",
  "plan.premium": "Premium",
  "plan.horizon": "Horizon",
  "coach.welcome": "Bienvenido — define supuestos y usa Simulación para probar escenarios.",
  "share.title": "Comparte tu progreso",
  "share.cta": "Copiar resumen para redes",
  "ai.title": "Coach de jubilación",
  "ai.placeholder": "Pregunta sobre tu plan…",
};

export const MESSAGES: Record<AppLocale, Catalog> = { en: EN, pt: PT, es: ES };

export function t(
  locale: AppLocale,
  key: MessageKey,
  simple = false
): string {
  const base = MESSAGES[locale][key] ?? MESSAGES.en[key] ?? key;
  if (!simple) return base;
  return simplifyLabel(base);
}

function simplifyLabel(text: string): string {
  return text
    .replace(/assumptions|premissas|supuestos/gi, "numbers you control")
    .replace(/projection/gi, "future guess")
    .replace(/Monte Carlo/gi, "many possible futures")
    .replace(/CAGR/gi, "average yearly growth");
}