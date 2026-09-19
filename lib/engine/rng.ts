/** Mulberry32 — small, fast, seedable. Same seed → same stream, always. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a += 0x6d2b79f5;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashSeed(parts: Array<string | number>): number {
  const text = parts.join("|");
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * Standard normal via Box–Muller. Unlike `(Math.random()-0.5)*σ`, this has
 * unbounded tails so a 15% vol year can actually produce a crash.
 */
export function nextStandardNormal(rng: () => number): number {
  const u1 = Math.max(rng(), Number.EPSILON);
  const u2 = rng();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

/** Student-t with `df` degrees, scaled so Var ≈ 1 before multiplying by σ. */
export function nextStudentT(rng: () => number, df = 5): number {
  const z = nextStandardNormal(rng);
  let v = 0;
  for (let i = 0; i < df; i++) {
    const g = nextStandardNormal(rng);
    v += g * g;
  }
  const t = z / Math.sqrt(v / df);
  const scale = Math.sqrt(df / (df - 2));
  return t / scale;
}

export function shockReturn(
  mean: number,
  sigma: number,
  rng: () => number,
  fatTails = true
): number {
  const z = fatTails ? nextStudentT(rng, 5) : nextStandardNormal(rng);
  return mean + sigma * z;
}
