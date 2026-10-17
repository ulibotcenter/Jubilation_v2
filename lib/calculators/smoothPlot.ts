import type { FreedomChartPoint } from "@/lib/calculators/chartSeries";

export type FreedomPlotPoint = FreedomChartPoint & {
  /** Top of the blue contributions band (coral + aportes). */
  blueTop: number;
  /** Top of the gold returns band — equals the wealth line. */
  goldTop: number;
  /** Height of the coral withdrawal band; 0 while contributing. */
  coral: number;
  /** Smoothed wealth used only for the painted curve. */
  lineY: number;
};

/**
 * Scale aportes + rendimentos + saques onto remaining wealth so the gold
 * band meets the line and nothing paints above it.
 */
export function fitLayersToWealth(
  point: FreedomChartPoint,
  wealth = Math.max(0, point.wealth)
): Pick<
  FreedomPlotPoint,
  | "blueTop"
  | "goldTop"
  | "coral"
  | "lineY"
  | "contributions"
  | "returns"
  | "withdrawals"
> {
  let coral = Math.max(0, point.withdrawals);
  let contributions = Math.max(0, point.contributions);
  let returns = Math.max(0, point.returns);
  if (wealth <= 0) {
    return {
      blueTop: 0,
      goldTop: 0,
      coral: 0,
      lineY: 0,
      contributions: 0,
      returns: 0,
      withdrawals: 0,
    };
  }
  const sum = contributions + returns + coral;
  if (sum > 0) {
    const scale = wealth / sum;
    contributions *= scale;
    returns *= scale;
    coral *= scale;
  } else {
    returns = wealth;
  }
  const goldTop = wealth;
  const blueTop = Math.min(goldTop, coral + contributions);
  coral = Math.min(coral, blueTop);
  return {
    blueTop,
    goldTop,
    coral,
    lineY: wealth,
    contributions,
    returns,
    withdrawals: coral,
  };
}

/**
 * Visual-only stack that always sits under the wealth curve.
 * Remaining contributions + remaining returns still equal wealth in the
 * source series; this carves a coral band from that remaining height after
 * freedom so withdrawals read as a layer without building a peak triangle.
 */
export function layersUnderWealth(point: FreedomChartPoint): {
  blueTop: number;
  goldTop: number;
  coral: number;
} {
  const wealth = Math.max(0, point.wealth);
  const contributions = Math.min(Math.max(0, point.contributions), wealth);
  const gap = Math.max(0, point.withdrawals);
  if (wealth === 0) {
    return { blueTop: 0, goldTop: 0, coral: 0 };
  }
  if (gap === 0) {
    return { blueTop: contributions, goldTop: wealth, coral: 0 };
  }
  const coral = wealth * (gap / (wealth + gap));
  const leftover = wealth - coral;
  return {
    blueTop: leftover * (contributions / wealth),
    goldTop: leftover,
    coral,
  };
}

function slopes(xs: number[], ys: number[]): number[] {
  const n = xs.length;
  if (n < 2) return ys.map(() => 0);
  const delta: number[] = [];
  for (let i = 0; i < n - 1; i++) {
    const dx = xs[i + 1] - xs[i];
    delta[i] = dx === 0 ? 0 : (ys[i + 1] - ys[i]) / dx;
  }
  const m = new Array<number>(n);
  m[0] = delta[0] ?? 0;
  m[n - 1] = delta[n - 2] ?? 0;
  for (let i = 1; i < n - 1; i++) {
    if (delta[i - 1] === 0 || delta[i] === 0 || delta[i - 1] * delta[i] < 0) {
      m[i] = 0;
    } else {
      const dx0 = xs[i] - xs[i - 1];
      const dx1 = xs[i + 1] - xs[i];
      m[i] = (delta[i - 1] * dx1 + delta[i] * dx0) / (dx0 + dx1);
    }
  }
  for (let i = 0; i < n - 1; i++) {
    if (delta[i] === 0) {
      m[i] = 0;
      m[i + 1] = 0;
      continue;
    }
    const a = m[i] / delta[i];
    const b = m[i + 1] / delta[i];
    const s = a * a + b * b;
    if (s > 9) {
      const t = 3 / Math.sqrt(s);
      m[i] = t * a * delta[i];
      m[i + 1] = t * b * delta[i];
    }
  }
  return m;
}

function hermite(
  x0: number,
  y0: number,
  m0: number,
  x1: number,
  y1: number,
  m1: number,
  x: number
): number {
  const h = x1 - x0;
  if (h === 0) return y0;
  const t = (x - x0) / h;
  const t2 = t * t;
  const t3 = t2 * t;
  return (
    (2 * t3 - 3 * t2 + 1) * y0 +
    (t3 - 2 * t2 + t) * h * m0 +
    (-2 * t3 + 3 * t2) * y1 +
    (t3 - t2) * h * m1
  );
}

function interpolate(
  xs: number[],
  ys: number[],
  m: number[],
  x: number
): number {
  if (x <= xs[0]!) return ys[0]!;
  const last = xs.length - 1;
  if (x >= xs[last]!) return ys[last]!;
  let i = 0;
  while (i < last && xs[i + 1]! < x) i += 1;
  return hermite(xs[i]!, ys[i]!, m[i]!, xs[i + 1]!, ys[i + 1]!, m[i + 1]!, x);
}

/**
 * Visual-only resampling. Keeps yearly engine values as knots and fills
 * monotone cubics so the calculator chart is a curve, not a triangle.
 */
export function densifyMonotone(
  series: FreedomChartPoint[],
  stepsPerYear = 12
): FreedomPlotPoint[] {
  if (series.length === 0) return [];

  const knotValues = (key: keyof FreedomChartPoint) =>
    series.map((point) => {
      const value = point[key];
      return typeof value === "number" ? value : 0;
    });

  const withLayers = (point: FreedomChartPoint): FreedomPlotPoint => {
    const layers = layersUnderWealth(point);
    return { ...point, ...layers, lineY: point.wealth };
  };

  if (series.length === 1 || stepsPerYear <= 1) {
    return roundPaintPath(series.map(withLayers));
  }

  const xs = series.map((point) => point.age);
  const keys = ["wealth", "contributions", "returns", "withdrawals"] as const;
  const columns = Object.fromEntries(
    keys.map((key) => {
      const ys = knotValues(key);
      return [key, { ys, m: slopes(xs, ys) }];
    })
  ) as Record<(typeof keys)[number], { ys: number[]; m: number[] }>;

  const sample = (key: (typeof keys)[number], age: number) =>
    Math.max(0, interpolate(xs, columns[key].ys, columns[key].m, age));

  const out: FreedomPlotPoint[] = [];
  for (let i = 0; i < series.length - 1; i++) {
    const x0 = xs[i]!;
    const x1 = xs[i + 1]!;
    const steps = Math.max(1, Math.round((x1 - x0) * stepsPerYear));
    for (let s = 0; s < steps; s++) {
      const age = x0 + ((x1 - x0) * s) / steps;
      const wealth = sample("wealth", age);
      const contributions = Math.min(wealth, sample("contributions", age));
      const withdrawals = sample("withdrawals", age);
      const returns = Math.max(0, wealth - contributions);
      const src = s / steps < 0.5 ? series[i]! : series[i + 1]!;
      out.push(
        withLayers({
          ...src,
          age,
          wealth,
          contributions,
          returns,
          withdrawals,
          accumulate: src.accumulate == null ? null : wealth,
          withdraw: src.withdraw == null ? null : wealth,
        })
      );
    }
  }
  out.push(withLayers(series.at(-1)!));
  return roundPaintPath(out);
}

/**
 * Painter tops under the wealth line. Gold rides patrimonio; blue sits on
 * coral; coral is the withdrawal slice. Layers never exceed wealth.
 */
export function layersJourney(point: FreedomChartPoint): {
  blueTop: number;
  goldTop: number;
  coral: number;
} {
  const fitted = fitLayersToWealth(point);
  return {
    blueTop: fitted.blueTop,
    goldTop: fitted.goldTop,
    coral: fitted.coral,
  };
}

/**
 * Visual-only resampling. Yearly engine wealth stays the knot; interpolated
 * bands are scaled so they stay under the line and sum to patrimonio.
 */
export function densifyJourney(
  series: FreedomChartPoint[],
  stepsPerYear = 12
): FreedomPlotPoint[] {
  if (series.length === 0) return [];

  const knotValues = (key: keyof FreedomChartPoint) =>
    series.map((point) => {
      const value = point[key];
      return typeof value === "number" ? value : 0;
    });

  const withLayers = (point: FreedomChartPoint): FreedomPlotPoint => {
    const fitted = fitLayersToWealth(point);
    return { ...point, ...fitted };
  };

  if (series.length === 1 || stepsPerYear <= 1) {
    return roundJourneyPath(series.map(withLayers));
  }

  const xs = series.map((point) => point.age);
  const keys = ["wealth", "contributions", "returns", "withdrawals"] as const;
  const columns = Object.fromEntries(
    keys.map((key) => {
      const ys = knotValues(key);
      return [key, { ys, m: slopes(xs, ys) }];
    })
  ) as Record<(typeof keys)[number], { ys: number[]; m: number[] }>;
  const blueKnots = series.map(
    (point) => Math.max(0, point.contributions) + Math.max(0, point.withdrawals)
  );
  const blueSlopes = slopes(xs, blueKnots);

  const sample = (key: (typeof keys)[number], age: number) =>
    Math.max(0, interpolate(xs, columns[key].ys, columns[key].m, age));

  const firstWithdrawAge = series.find((point) => point.withdrawals > 0)?.age;

  const out: FreedomPlotPoint[] = [];
  for (let i = 0; i < series.length - 1; i++) {
    const x0 = xs[i]!;
    const x1 = xs[i + 1]!;
    const steps = Math.max(1, Math.round((x1 - x0) * stepsPerYear));
    for (let s = 0; s < steps; s++) {
      const age = x0 + ((x1 - x0) * s) / steps;
      const wealth = sample("wealth", age);
      const src = s / steps < 0.5 ? series[i]! : series[i + 1]!;
      const withdrawals =
        firstWithdrawAge == null || age < firstWithdrawAge
          ? 0
          : sample("withdrawals", age);
      const silhouette = Math.max(
        withdrawals,
        interpolate(xs, blueKnots, blueSlopes, age)
      );
      const contributions = Math.max(0, silhouette - withdrawals);
      const returns = Math.max(0, wealth - withdrawals - contributions);
      out.push(
        withLayers({
          ...src,
          age,
          wealth,
          contributions,
          returns,
          withdrawals,
          accumulate: src.accumulate == null ? null : wealth,
          withdraw: src.withdraw == null ? null : wealth,
        })
      );
    }
  }
  out.push(withLayers(series.at(-1)!));
  return roundJourneyPath(out);
}

/**
 * Round the painted peak so the wealth line is a curve. Bands are mixed
 * with the same blend, then scaled back onto the painted line.
 */
export function roundJourneyPath(
  plot: FreedomPlotPoint[],
  sigmaYears = 3.8
): FreedomPlotPoint[] {
  if (plot.length < 3 || sigmaYears <= 0) return plot;
  const twoS2 = 2 * sigmaYears * sigmaYears;
  const radius = sigmaYears * 4.6;
  const smoothed = plot.map((point) => {
    let weight = 0;
    let wealth = 0;
    let silhouette = 0;
    let returns = 0;
    let withdrawals = 0;
    for (const other of plot) {
      const da = other.age - point.age;
      if (Math.abs(da) > radius) continue;
      const w = Math.exp(-(da * da) / twoS2);
      weight += w;
      wealth += w * other.wealth;
      silhouette +=
        w * (Math.max(0, other.contributions) + Math.max(0, other.withdrawals));
      returns += w * other.returns;
      withdrawals += w * other.withdrawals;
    }
    return {
      wealth: weight === 0 ? point.wealth : wealth / weight,
      silhouette:
        weight === 0
          ? Math.max(0, point.contributions) + Math.max(0, point.withdrawals)
          : silhouette / weight,
      returns: weight === 0 ? point.returns : returns / weight,
      withdrawals: weight === 0 ? point.withdrawals : withdrawals / weight,
    };
  });
  const peakAge = plot.reduce((best, point) =>
    point.wealth > best.wealth ? point : best
  ).age;
  const blendSigma = 6.2;
  const blendTwoS2 = 2 * blendSigma * blendSigma;
  return plot.map((point, index) => {
    const blend = Math.exp(
      -((point.age - peakAge) * (point.age - peakAge)) / blendTwoS2
    );
    const mixed = smoothed[index]!;
    const lineY = mixed.wealth * blend + point.wealth * (1 - blend);
    const coral =
      point.withdrawals <= 0
        ? 0
        : mixed.withdrawals * blend + point.withdrawals * (1 - blend);
    const silhouette =
      mixed.silhouette * blend +
      (Math.max(0, point.contributions) + Math.max(0, point.withdrawals)) *
        (1 - blend);
    const fitted = fitLayersToWealth(
      {
        ...point,
        wealth: lineY,
        contributions: Math.max(0, silhouette - coral),
        returns: mixed.returns * blend + point.returns * (1 - blend),
        withdrawals: coral,
      },
      lineY
    );
    return { ...point, ...fitted, wealth: point.wealth, lineY };
  });
}

/**
 * Visual-only rounding so the painted hill is a curve, not a pointed
 * triangle. Blend is strongest at the peak; yearly engine values on the
 * point stay untouched for tooltips and labels.
 */
export function roundPaintPath(
  plot: FreedomPlotPoint[],
  sigmaYears = 2.15
): FreedomPlotPoint[] {
  if (plot.length < 3 || sigmaYears <= 0) return plot;
  const twoS2 = 2 * sigmaYears * sigmaYears;
  const radius = sigmaYears * 4;
  const smoothed = plot.map((point) => {
    let weight = 0;
    let wealth = 0;
    let contributions = 0;
    let withdrawals = 0;
    for (const other of plot) {
      const da = other.age - point.age;
      if (Math.abs(da) > radius) continue;
      const w = Math.exp(-(da * da) / twoS2);
      weight += w;
      wealth += w * other.wealth;
      contributions += w * other.contributions;
      withdrawals += w * other.withdrawals;
    }
    return {
      wealth: weight === 0 ? point.wealth : wealth / weight,
      contributions:
        weight === 0 ? point.contributions : contributions / weight,
      withdrawals: weight === 0 ? point.withdrawals : withdrawals / weight,
    };
  });
  const peakAge = plot.reduce((best, point) =>
    point.wealth > best.wealth ? point : best
  ).age;
  const blendSigma = 3.4;
  const blendTwoS2 = 2 * blendSigma * blendSigma;
  return plot.map((point, index) => {
    const blend = Math.exp(
      -((point.age - peakAge) * (point.age - peakAge)) / blendTwoS2
    );
    const mixed = smoothed[index]!;
    const lineY = mixed.wealth * blend + point.wealth * (1 - blend);
    const layers = layersUnderWealth({
      ...point,
      wealth: lineY,
      contributions:
        mixed.contributions * blend + point.contributions * (1 - blend),
      withdrawals: mixed.withdrawals * blend + point.withdrawals * (1 - blend),
    });
    return { ...point, ...layers, lineY };
  });
}

/**
 * Samples a monotone cubic between yearly knots.
 * At each integer age, `lineY` is that year's wealth — the crest is rounded
 * only between knots, and it never rises above the real peak.
 * Aportes, rendimentos, and saques are clamped so they sum to the line.
 */
export function densifyHill(
  series: FreedomChartPoint[],
  stepsPerYear = 24
): FreedomPlotPoint[] {
  if (series.length === 0) return [];
  const ordered = [...series].sort((a, b) => a.age - b.age);
  const knots = ordered.map((point) => {
    const fitted = fitLayersToWealth(point);
    return {
      ...point,
      ...fitted,
      lineY: Math.max(0, point.wealth),
    };
  });
  if (knots.length === 1 || stepsPerYear <= 1) return knots;

  const xs = knots.map((point) => point.age);
  const wealth = knots.map((point) => Math.max(0, point.wealth));
  const coral = knots.map((point) => point.coral);
  const blue = knots.map((point) => point.blueTop);
  const wealthSlope = slopes(xs, wealth);
  const coralSlope = slopes(xs, coral);
  const blueSlope = slopes(xs, blue);

  const out: FreedomPlotPoint[] = [];
  const sample = (age: number, src: FreedomChartPoint): FreedomPlotPoint => {
    // One monotone cubic. Slope is continuous, including through the crest,
    // so the peak does not grow a shelf or a notch.
    const lineY = Math.max(0, interpolate(xs, wealth, wealthSlope, age));
    let coralY = Math.max(0, interpolate(xs, coral, coralSlope, age));
    let blueY = Math.max(0, interpolate(xs, blue, blueSlope, age));
    coralY = Math.min(coralY, lineY);
    blueY = Math.min(Math.max(blueY, coralY), lineY);
    return {
      ...src,
      age,
      wealth: lineY,
      contributions: blueY - coralY,
      returns: lineY - blueY,
      withdrawals: coralY,
      accumulate: src.accumulate == null ? null : lineY,
      withdraw: src.withdraw == null ? null : lineY,
      coral: coralY,
      blueTop: blueY,
      goldTop: lineY,
      lineY,
    };
  };

  for (let i = 0; i < knots.length - 1; i++) {
    const x0 = xs[i]!;
    const x1 = xs[i + 1]!;
    const steps = Math.max(1, Math.round((x1 - x0) * stepsPerYear));
    out.push(knots[i]!);
    for (let s = 1; s < steps; s++) {
      const age = x0 + ((x1 - x0) * s) / steps;
      out.push(sample(age, knots[i]!));
    }
  }
  out.push(knots[knots.length - 1]!);
  return out;
}
