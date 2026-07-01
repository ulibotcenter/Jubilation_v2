"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "@/lib/i18n/useTranslation";

interface ChartSkeletonProps {
  visible: boolean;
}

export function ChartSkeleton({ visible }: ChartSkeletonProps) {
  const { t } = useTranslation();

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="absolute inset-0 z-10 flex flex-col justify-end gap-2 p-4 rounded-xl overflow-hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
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
      )}
    </AnimatePresence>
  );
}