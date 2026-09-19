"use client";

import { motion } from "framer-motion";
import { useTranslation } from "@/lib/i18n/useTranslation";

interface ChartSkeletonProps {
  visible: boolean;
  revision?: number;
}

export function ChartSkeleton({ visible, revision = 0 }: ChartSkeletonProps) {
  const { t } = useTranslation();
  if (!visible) return null;

  return (
    <motion.div
      key={revision}
      className="absolute inset-0 z-10 flex flex-col justify-end gap-2 p-4 rounded-xl overflow-hidden pointer-events-none"
      initial={{ opacity: 1 }}
      animate={{ opacity: 0 }}
      transition={{ duration: 0.25, delay: 0.4 }}
      aria-hidden="true"
    >
      <div className="absolute inset-0 bg-background/40 backdrop-blur-[2px]" />
      <div className="relative flex items-end justify-between gap-1.5 h-[75%] px-2">
        {[40, 55, 45, 70, 60, 85, 75, 90, 80, 95].map((h, i) => (
          <div
            key={i}
            className="flex-1 skeleton rounded-t-md"
            style={{ height: `${h}%` }}
          />
        ))}
      </div>
      <p className="relative text-center text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        {t("chart.recalculating")}
      </p>
    </motion.div>
  );
}
