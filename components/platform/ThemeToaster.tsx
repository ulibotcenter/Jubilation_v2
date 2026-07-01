"use client";

import { Toaster } from "sonner";
import { useAppStore } from "@/store/useAppStore";

export function ThemeToaster() {
  const theme = useAppStore((s) => s.theme);

  return (
    <Toaster
      theme={theme}
      position="top-right"
      richColors
      closeButton
      expand={false}
      visibleToasts={4}
      toastOptions={{
        duration: 4000,
        style: {
          background: "var(--surface-elevated)",
          border: "1px solid var(--border)",
          color: "var(--foreground)",
        },
      }}
      className="!top-[calc(var(--topbar-height)+0.5rem)] sm:!top-4"
    />
  );
}