import type { Transition } from "framer-motion";

export const EASE_OUT = [0.4, 0, 0.2, 1] as const;

export function fadeUp(reduced: boolean | null, delay = 0) {
  if (reduced) {
    return {
      initial: { opacity: 1, y: 0 },
      animate: { opacity: 1, y: 0 },
      transition: { duration: 0 } satisfies Transition,
    };
  }
  return {
    initial: { opacity: 0, y: 12 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.45, delay, ease: EASE_OUT } satisfies Transition,
  };
}

export function chartMotion(reduced: boolean | null) {
  return {
    isAnimationActive: !reduced,
    animationDuration: reduced ? 0 : 700,
    animationEasing: "ease-out" as const,
  };
}
