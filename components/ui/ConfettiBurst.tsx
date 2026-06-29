"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const COLORS = ["#ff7040", "#ff9a6c", "#22c55e", "#fbbf24", "#f8fafc"];

interface Particle {
  id: number;
  x: number;
  y: number;
  color: string;
  size: number;
  rotation: number;
}

function generateParticles(count: number): Particle[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: (Math.random() - 0.5) * 280,
    y: (Math.random() - 0.5) * 120 - 40,
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    size: Math.random() * 6 + 4,
    rotation: Math.random() * 360,
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
  const [particles, setParticles] = useState<Particle[]>([]);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (trigger === 0) return;
    setParticles(generateParticles(28));
    setVisible(true);
    const t = setTimeout(() => setVisible(false), 2200);
    return () => clearTimeout(t);
  }, [trigger]);

  const originClass =
    origin === "left" ? "left-16 top-1/2" : "left-1/2 top-1/3";

  return (
    <div
      className={`pointer-events-none fixed ${originClass} -translate-x-1/2 z-[200] overflow-visible`}
      aria-hidden="true"
    >
      <AnimatePresence>
        {visible &&
          particles.map((p) => (
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
                duration: 1.6 + Math.random() * 0.6,
                ease: [0.2, 0.8, 0.2, 1],
              }}
            />
          ))}
      </AnimatePresence>
    </div>
  );
}