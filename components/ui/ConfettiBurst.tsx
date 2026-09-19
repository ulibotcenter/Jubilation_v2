"use client";

import { useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { mulberry32 } from "@/lib/engine/rng";

const COLORS = ["#ff7040", "#ff9a6c", "#22c55e", "#fbbf24", "#f8fafc"];

interface Particle {
  id: number;
  x: number;
  y: number;
  color: string;
  size: number;
  rotation: number;
  duration: number;
}

function generateParticles(count: number, seed: number): Particle[] {
  const rng = mulberry32(seed || 1);
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: (rng() - 0.5) * 280,
    y: (rng() - 0.5) * 120 - 40,
    color: COLORS[Math.floor(rng() * COLORS.length)],
    size: rng() * 6 + 4,
    rotation: rng() * 360,
    duration: 1.6 + rng() * 0.6,
  }));
}

interface ConfettiBurstProps {
  trigger: number;
  origin?: "center" | "left";
}

export function ConfettiBurst({
  trigger,
  origin = "center",
}: ConfettiBurstProps) {
  const [burst, setBurst] = useState<{ trigger: number; particles: Particle[] }>(
    { trigger: 0, particles: [] }
  );
  if (trigger !== 0 && trigger !== burst.trigger) {
    setBurst({ trigger, particles: generateParticles(28, trigger) });
  }

  const reduced = useReducedMotion();

  const originClass =
    origin === "left" ? "left-16 top-1/2" : "left-1/2 top-1/3";
  const visible = burst.trigger !== 0 && burst.trigger === trigger;

  if (reduced) return null;

  return (
    <div
      className={`pointer-events-none fixed ${originClass} -translate-x-1/2 z-[200] overflow-visible`}
      aria-hidden="true"
    >
      <AnimatePresence>
        {visible &&
          burst.particles.map((p) => (
            <motion.span
              key={`${trigger}-${p.id}`}
              className="absolute rounded-sm"
              style={{
                width: p.size,
                height: p.size * 0.6,
                backgroundColor: p.color,
              }}
              initial={{ x: 0, y: 0, opacity: 1, rotate: 0, scale: 1 }}
              animate={{
                x: p.x,
                y: p.y + 80,
                opacity: 0,
                rotate: p.rotation + 180,
                scale: 0.2,
              }}
              exit={{ opacity: 0 }}
              transition={{
                duration: p.duration,
                ease: [0.2, 0.8, 0.2, 1],
              }}
            />
          ))}
      </AnimatePresence>
    </div>
  );
}
