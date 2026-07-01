import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeToaster } from "@/components/platform/ThemeToaster";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL ?? "https://jubilation-v2.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: {
    default: "Jubilation — Retirement Planning",
    template: "%s | Jubilation",
  },
  description:
    "Premium retirement planning dashboard. Track your portfolio, edit assumptions, run Monte Carlo simulations and stress tests. Free beta.",
  applicationName: "Jubilation",
  keywords: [
    "retirement planning",
    "portfolio tracker",
    "Monte Carlo simulation",
    "financial planning",
    "FIRE",
    "net worth",
    "retirement calculator",
  ],
  authors: [{ name: "Jubilation" }],
  creator: "Jubilation",
  publisher: "Jubilation",
  category: "finance",
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: APP_URL,
    siteName: "Jubilation",
    title: "Jubilation — Retirement Planning",
    description:
      "Plan your retirement with confidence. Projections, simulations, and stress tests in one premium dashboard.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Jubilation — Retirement Planning",
    description:
      "Premium retirement planning dashboard. Share with friends — beta is live.",
  },
  // i18n-ready: alternates.languages → { en, pt, es } via next-intl
  alternates: {
    canonical: APP_URL,
  },
  icons: {
    icon: "/favicon.ico",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Jubilation",
    // TODO: native mobile app — shared web shell via Capacitor/React Native
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#020617" },
    { media: "(prefers-color-scheme: light)", color: "#020617" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  colorScheme: "dark light",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var r=localStorage.getItem('jubilation-v2-state');var s=r?JSON.parse(r):null;var st=s&&s.state;var th=(st&&st.theme)||'light';var loc=(st&&st.locale)||'en';var el=document.documentElement;el.classList.remove('dark','light');el.classList.add(th);el.style.colorScheme=th;el.lang=loc;}catch(e){document.documentElement.classList.add('light');}})();`,
          }}
        />
      </head>
      <body className="min-h-dvh flex flex-col bg-background text-foreground">
        {children}
        <ThemeToaster />
      </body>
    </html>
  );
}