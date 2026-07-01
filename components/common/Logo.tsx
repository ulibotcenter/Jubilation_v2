"use client";

import { motion } from "framer-motion";
import { useTranslation } from "@/lib/i18n/useTranslation";

interface LogoProps {
  size?: "sm" | "md" | "lg";
  showTagline?: boolean;
  collapsed?: boolean;
  className?: string;
}

const SIZES = {
  sm: { icon: "w-7 h-7", title: "text-base", tagline: "text-[10px]" },
  md: { icon: "w-8 h-8", title: "text-lg", tagline: "text-xs" },
  lg: { icon: "w-10 h-10", title: "text-xl", tagline: "text-sm" },
};

export function Logo({
  size = "md",
  showTagline = false,
  collapsed = false,
  className = "",
}: LogoProps) {
  const { t } = useTranslation();
  const s = SIZES[size];

  if (collapsed) {
    return (
      <div className={`flex items-center justify-center ${className}`}>
        <motion.div
          className={`${s.icon} rounded-lg bg-gradient-to-br from-accent to-[#ff9a6c] flex items-center justify-center shadow-[var(--shadow-accent)]`}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.97 }}
          transition={{ type: "spring", stiffness: 400, damping: 20 }}
        >
          <span className="text-white font-black text-sm leading-none">J</span>
        </motion.div>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <motion.div
        className={`${s.icon} rounded-lg bg-gradient-to-br from-accent to-[#ff9a6c] flex items-center justify-center shadow-[var(--shadow-accent)] shrink-0`}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.97 }}
        transition={{ type: "spring", stiffness: 400, damping: 20 }}
      >
        <span className="text-white font-black text-sm leading-none">J</span>
      </motion.div>
      <div className="min-w-0 logo-text-wrap">
        <p className={`${s.title} font-bold tracking-tight leading-none`}>
          <span className="gradient-text">{t("app.name")}</span>
        </p>
        {showTagline && (
          <p className={`${s.tagline} text-muted-foreground mt-0.5 truncate`}>
            {t("app.tagline")}
          </p>
        )}
      </div>
    </div>
  );
}