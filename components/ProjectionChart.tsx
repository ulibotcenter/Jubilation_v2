"use client";

import { useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { PointerEvent, ReactNode } from "react";
import { FREEDOM_AREA_COLORS } from "@/lib/chartColors";
import type { ProjectionChartPoint } from "@/lib/calculators/chartSeries";
import type { FreedomChartPoint } from "@/lib/calculators/chartSeries";
import { densifyHill } from "@/lib/calculators/smoothPlot";
import { htmlLang } from "@/lib/i18n/htmlLang";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { useAppStore } from "@/store/useAppStore";
import {
  formatCurrencyValue,
  type Currency,
} from "@/types";

const LINE = FREEDOM_AREA_COLORS.line;
const BLUE = FREEDOM_AREA_COLORS.contributions;
const GOLD = FREEDOM_AREA_COLORS.returns;
const CORAL = FREEDOM_AREA_COLORS.withdrawals;

type Box = { x: number; y: number; w: number; h: number };

function overlaps(a: Box, b: Box, pad = 8) {
  return (
    a.x < b.x + b.w + pad &&
    a.x + a.w + pad > b.x &&
    a.y < b.y + b.h + pad &&
    a.y + a.h + pad > b.y
  );
}

function moneyTicks(max: number): number[] {
  if (!(max > 0)) return [0];
  const rough = max / 4;
  const pow = 10 ** Math.floor(Math.log10(rough));
  const n = rough / pow;
  const step = n <= 1.5 ? pow : n <= 3 ? 2 * pow : n <= 7 ? 5 * pow : 10 * pow;
  const ticks = [0];
  for (let value = step; value < max * 0.9; value += step) ticks.push(value);
  return ticks;
}

function ageTicks(start: number, end: number): number[] {
  const span = end - start;
  const step = span > 40 ? 10 : span > 18 ? 5 : 2;
  const ticks = new Set<number>([start, end]);
  const first = Math.ceil((start + 1) / step) * step;
  for (let age = first; age < end; age += step) {
    if (end - age >= step * 0.6) ticks.add(age);
  }
  return [...ticks].sort((a, b) => a - b);
}

function polyline(points: Array<{ x: number; y: number }>) {
  return points
    .map((point, index) => `${index === 0 ? "M" : "L"}${point.x.toFixed(1)} ${point.y.toFixed(1)}`)
    .join(" ");
}

function bandPath(
  top: Array<{ x: number; y: number }>,
  bottom: Array<{ x: number; y: number }>
) {
  if (top.length < 2) return "";
  const back = [...bottom]
    .reverse()
    .map((point) => `L${point.x.toFixed(1)} ${point.y.toFixed(1)}`)
    .join(" ");
  return `${polyline(top)} ${back} Z`;
}

function textWidth(text: string, size: number) {
  return Math.max(8, text.length * size * 0.62);
}

function erf(x: number): number {
  const sign = x < 0 ? -1 : 1;
  const a = Math.abs(x);
  const t = 1 / (1 + 0.3275911 * a);
  const y =
    1 -
    (((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t +
      0.254829592) *
      t *
      Math.exp(-a * a));
  return sign * y;
}

/**
 * Age position with extra width around the crest. Yearly balances stay put;
 * the one-year turn gets enough room to read as a curve.
 */
function crestPosition(age: number, peakAge: number, emphasis = 2, sigma = 8.5) {
  const z = (age - peakAge) / sigma;
  return age + emphasis * sigma * Math.sqrt(Math.PI) * 0.5 * erf(z);
}

function hermiteY(y0: number, slope0: number, y1: number, slope1: number, h: number, t: number) {
  const t2 = t * t;
  const t3 = t2 * t;
  return (
    (2 * t3 - 3 * t2 + 1) * y0 +
    (t3 - 2 * t2 + t) * h * slope0 +
    (-2 * t3 + 3 * t2) * y1 +
    (t3 - t2) * h * slope1
  );
}

/**
 * One screen-space curve through every yearly balance. The slope is shared
 * at each age, eases across the two years around the crest, and is flat on
 * the peak — so the tip cannot grow a corner, a hook, or a shelf.
 */
function roundCrestLine<T extends { x: number; line: number; age: number }>(points: T[]): T[] {
  const knots: number[] = [];
  for (let i = 0; i < points.length; i++) {
    if (Math.abs(points[i]!.age - Math.round(points[i]!.age)) < 0.02) knots.push(i);
  }
  if (knots.length < 4) return points;
  let peakI = 0;
  for (let i = 1; i < points.length; i++) {
    if (points[i]!.line < points[peakI]!.line) peakI = i;
  }
  let peakK = 0;
  for (let k = 1; k < knots.length; k++) {
    if (Math.abs(knots[k]! - peakI) < Math.abs(knots[peakK]! - peakI)) peakK = k;
  }
  const delta: number[] = [];
  for (let k = 0; k < knots.length - 1; k++) {
    const a = points[knots[k]!]!;
    const b = points[knots[k + 1]!]!;
    delta[k] = b.x === a.x ? 0 : (b.line - a.line) / (b.x - a.x);
  }
  const slope = new Array<number>(knots.length);
  slope[0] = delta[0] ?? 0;
  slope[knots.length - 1] = delta[delta.length - 1] ?? 0;
  for (let k = 1; k < knots.length - 1; k++) {
    const prev = delta[k - 1] ?? 0;
    const next = delta[k] ?? 0;
    slope[k] = prev === 0 || next === 0 || prev * next < 0 ? 0 : (prev + next) / 2;
  }
  const clampSegments = () => {
    for (let k = 0; k < delta.length; k++) {
      const step = delta[k] ?? 0;
      if (step === 0) {
        slope[k] = 0;
        slope[k + 1] = 0;
        continue;
      }
      const a = (slope[k] ?? 0) / step;
      const b = (slope[k + 1] ?? 0) / step;
      const sum = a * a + b * b;
      if (sum > 9) {
        const scale = 3 / Math.sqrt(sum);
        slope[k] = scale * a * step;
        slope[k + 1] = scale * b * step;
      }
    }
  };
  clampSegments();
  slope[peakK] = 0;
  const soften = (k: number, factor: number) => {
    if (k > 0 && k < slope.length) slope[k] = (slope[k] ?? 0) * factor;
  };
  soften(peakK - 1, 0.62);
  soften(peakK + 1, 0.62);
  soften(peakK - 2, 0.84);
  soften(peakK + 2, 0.84);
  clampSegments();
  slope[peakK] = 0;
  const knotSet = new Set(knots);

  return points.map((point, index) => {
    if (knotSet.has(index) || index <= knots[0]! || index >= knots[knots.length - 1]!) {
      return point;
    }
    let k = 0;
    while (k < knots.length - 2 && index > knots[k + 1]!) k += 1;
    const left = points[knots[k]!]!;
    const right = points[knots[k + 1]!]!;
    const h = right.x - left.x;
    if (h < 1) return point;
    const y = hermiteY(
      left.line,
      slope[k] ?? 0,
      right.line,
      slope[k + 1] ?? 0,
      h,
      (point.x - left.x) / h
    );
    const low = Math.max(left.line, right.line);
    const high = Math.min(left.line, right.line);
    return { ...point, line: Math.min(low, Math.max(high, y)) };
  });
}

function asSeries(data: ProjectionChartPoint[]): FreedomChartPoint[] {
  return data.map((point) => ({
    age: point.age,
    wealth: point.patrimonio,
    contributions: point.aportes,
    returns: point.rendimentos,
    withdrawals: point.saques,
    accumulate: null,
    withdraw: null,
  }));
}

function currencyFromSymbol(symbol: string): Currency {
  if (symbol === "$" || symbol === "US$") return "USD";
  if (symbol === "€") return "EUR";
  return "BRL";
}

export function ProjectionChart({
  data,
  currency = "R$",
  currencyCode,
  freedomAge,
  children,
}: {
  data: ProjectionChartPoint[];
  currency?: string;
  currencyCode?: Currency;
  freedomAge?: number;
  children?: ReactNode;
}) {
  const plotRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(680);
  const [hoverAge, setHoverAge] = useState<number | null>(null);
  const rawId = useId().replace(/:/g, "");
  const { t, locale } = useTranslation();
  const storeCurrency = useAppStore((state) => state.currency);
  const code = currencyCode ?? storeCurrency ?? currencyFromSymbol(currency);
  const intlLocale = htmlLang(locale);

  useLayoutEffect(() => {
    const element = plotRef.current;
    if (!element) return;
    const measure = () => {
      const next = element.clientWidth;
      if (next > 0) setWidth(next);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const series = useMemo(() => asSeries(data), [data]);
  const plot = useMemo(() => densifyHill(series, 24), [series]);

  const peakKnot = useMemo(() => {
    if (data.length === 0) return undefined;
    return data.reduce((best, point) =>
      point.patrimonio > best.patrimonio ? point : best
    );
  }, [data]);
  const endKnot = data.at(-1);
  const freedom =
    freedomAge ?? data.find((point) => point.saques > 0)?.age;

  const compact = width < 560;
  const money = (value: number) =>
    formatCurrencyValue(value, code, true, intlLocale);
  const moneyFull = (value: number) =>
    formatCurrencyValue(value, code, false, intlLocale);

  const title = t("calc.freedom.chart.title");
  const subtitle = t("calc.freedom.chart.subtitle");
  const description = t("calc.freedom.chart.description");
  const aportesLabel = t("calc.freedom.chart.contributions");
  const aportesHint = t("calc.freedom.chart.contributionsHint");
  const rendimentosLabel = t("calc.freedom.chart.returns");
  const rendimentosHint = t("calc.freedom.chart.returnsHint");
  const saquesLabel = t("calc.freedom.chart.withdrawals");
  const saquesHint = t("calc.freedom.chart.withdrawalsHint");
  const patrimonioLabel = t("calc.freedom.chart.remaining");
  const peakTitle = t("calc.freedom.chart.peakMark");
  const axisAge = t("calc.freedom.chart.axisAge");
  const freedomLabel = t("calc.freedom.chart.withdraw");
  const ageWord = (age: number) => t("landing.chart.tooltipAge", { age });

  if (!peakKnot || !endKnot || plot.length < 2) return null;

  const peakDetail = t("calc.freedom.chart.peakDetail", {
    age: peakKnot.age,
    amount: money(peakKnot.patrimonio),
  });
  const endTitle = t("calc.freedom.chart.endMark", { age: endKnot.age });
  const endDetail = t("calc.freedom.chart.endDetail", {
    amount: money(endKnot.patrimonio),
  });

  const endLabelW = Math.max(textWidth(endTitle, 12), textWidth(endDetail, 11.5));
  const margin = {
    top: compact ? 40 : 46,
    right: compact ? 8 : Math.max(108, Math.min(140, endLabelW + 28)),
    bottom: compact ? 88 : 72,
    left: compact ? 48 : 62,
  };
  const plotW = Math.max(80, width - margin.left - margin.right);
  // Wide and weighted, with the crest close to its callout. Extra height
  // turns this series into a spike; the age scale below opens the turn.
  const plotH = Math.round(
    compact
      ? Math.min(156, Math.max(128, plotW * 0.42))
      : Math.min(228, Math.max(188, plotW * 0.28))
  );
  const height = margin.top + plotH + margin.bottom;
  const xMin = plot[0]!.age;
  const xMax = plot.at(-1)!.age;
  const xSpan = Math.max(1, xMax - xMin);
  const yMax = Math.max(1, peakKnot.patrimonio * 1.05);
  const xPad = xSpan * 0.012;
  const xStart = crestPosition(xMin - xPad, peakKnot.age);
  const xEnd = crestPosition(xMax + xPad, peakKnot.age);
  const xOf = (age: number) =>
    margin.left + ((crestPosition(age, peakKnot.age) - xStart) / (xEnd - xStart)) * plotW;
  const yOf = (value: number) =>
    margin.top + plotH - (Math.max(0, value) / yMax) * plotH;
  const baseline = yOf(0);

  const pts = roundCrestLine(
    plot.map((point) => ({
      age: point.age,
      x: xOf(point.age),
      line: yOf(point.lineY),
      blue: yOf(point.blueTop),
      coral: yOf(point.coral),
      zero: baseline,
    }))
  );
  const lineD = polyline(pts.map((point) => ({ x: point.x, y: point.line })));
  const clipD = bandPath(
    pts.map((point) => ({ x: point.x, y: point.line })),
    pts.map((point) => ({ x: point.x, y: point.zero }))
  );
  const goldD = bandPath(
    pts.map((point) => ({ x: point.x, y: point.line })),
    pts.map((point) => ({ x: point.x, y: point.blue + 0.8 }))
  );
  const blueD = bandPath(
    pts.map((point) => ({ x: point.x, y: point.blue - 0.4 })),
    pts.map((point) => ({ x: point.x, y: point.coral + 0.8 }))
  );
  const coralD = bandPath(
    pts.map((point) => ({ x: point.x, y: point.coral - 0.4 })),
    pts.map((point) => ({ x: point.x, y: point.zero }))
  );
  const hasCoral = plot.some((point) => point.coral > peakKnot.patrimonio * 0.012);

  const peakX = xOf(peakKnot.age);
  const peakY = yOf(peakKnot.patrimonio);
  const endX = xOf(endKnot.age);
  const endY = yOf(endKnot.patrimonio);
  const freedomX = freedom == null ? null : xOf(freedom);
  const freedomPoint =
    freedom == null
      ? undefined
      : plot.reduce((best, point) =>
          Math.abs(point.age - freedom) < Math.abs(best.age - freedom)
            ? point
            : best
        );
  const freedomY = freedomPoint ? yOf(freedomPoint.lineY) : null;

  const yLabels = moneyTicks(yMax);
  const xLabels = ageTicks(xMin, xMax);

  const bandSpot = (
    kind: "aportes" | "rendimentos" | "saques"
  ): { x: number; y: number; h: number } | null => {
    const pool = plot.filter((point) => {
      if (kind === "saques") return point.coral > 0 && point.age >= (freedom ?? point.age);
      if (kind === "aportes") return point.age <= (freedom ?? xMax);
      return point.lineY - point.blueTop > 0;
    });
    if (pool.length < 2) return null;
    const lo = pool[0]!.age;
    const hi = pool.at(-1)!.age;
    const a0 = lo + (hi - lo) * 0.22;
    const a1 = lo + (hi - lo) * 0.72;
    let best: { x: number; y: number; h: number } | null = null;
    for (const point of pool) {
      if (point.age < a0 || point.age > a1) continue;
      if (kind !== "saques" && Math.abs(point.age - peakKnot.age) < 6) continue;
      const top =
        kind === "saques" ? point.coral : kind === "aportes" ? point.blueTop : point.lineY;
      const bot =
        kind === "saques" ? 0 : kind === "aportes" ? point.coral : point.blueTop;
      const h = yOf(bot) - yOf(top);
      if (!best || h > best.h) {
        best = { x: xOf(point.age), y: (yOf(top) + yOf(bot)) / 2, h };
      }
    }
    return best;
  };

  const minBand = compact ? 18 : 14;
  const aportesSpot = bandSpot("aportes");
  const returnsSpot = bandSpot("rendimentos");
  const saquesSpot = bandSpot("saques");

  const labelBox = (
    text: string,
    hint: string,
    x: number,
    y: number,
    size = compact ? 11 : 12.5
  ): Box => {
    const w = Math.max(textWidth(text, size), hint ? textWidth(hint, 9.5) : 0);
    const h = hint ? 28 : 16;
    return { x: x - w / 2, y: y - h / 2, w, h };
  };

  const peakW = Math.max(textWidth(peakTitle, 12), textWidth(peakDetail, 11));
  let peakCenter = peakX;
  if (peakCenter - peakW / 2 < 6) peakCenter = 6 + peakW / 2;
  if (peakCenter + peakW / 2 > width - 6) peakCenter = width - 6 - peakW / 2;
  const peakBox: Box = {
    x: peakCenter - peakW / 2,
    y: Math.max(2, peakY - 36),
    w: peakW,
    h: 30,
  };

  const sameCrest = peakKnot.age === endKnot.age;
  const endPlace = compact
    ? {
        x: width - 4,
        y: baseline + 42,
        anchor: "end" as const,
      }
    : {
        x: endX + 14,
        y: endY - 6,
        anchor: "start" as const,
      };
  const endBoxFor = (candidate: { x: number; anchor: "start" | "end" | "middle" }): Box => {
    const x =
      candidate.anchor === "start"
        ? candidate.x
        : candidate.anchor === "end"
          ? candidate.x - endLabelW
          : candidate.x - endLabelW / 2;
    return { x, y: endPlace.y - 4, w: endLabelW, h: 30 };
  };
  const endBox = sameCrest ? null : endBoxFor(endPlace);

  const showFreedom =
    freedom != null &&
    freedomY != null &&
    freedomX != null &&
    freedom > xMin + 0.4 &&
    freedom < xMax - 0.4;
  const freedomNearCrest = freedom != null && Math.abs(freedom - peakKnot.age) <= 2.5;
  const showFreedomDot =
    showFreedom &&
    !freedomNearCrest &&
    Math.abs(freedomX! - peakX) > 28 &&
    Math.abs(freedomX! - endX) > 28;
  const freedomText = freedom == null ? "" : `${freedomLabel} · ${freedom}`;
  const freedomW = textWidth(freedomText, 11);
  let freedomCenter = freedomX ?? 0;
  if (showFreedom && endBox && freedomX != null) {
    const draft = { x: freedomCenter - freedomW / 2, y: baseline + 36, w: freedomW, h: 14 };
    if (overlaps(draft, endBox, 6)) {
      freedomCenter = Math.min(freedomCenter, endBox.x - 10 - freedomW / 2);
    }
  }
  if (freedomCenter - freedomW / 2 < 4) freedomCenter = 4 + freedomW / 2;
  const freedomBox: Box | null =
    showFreedom && freedomX != null
      ? {
          x: freedomCenter - freedomW / 2,
          y: baseline + 36,
          w: freedomW,
          h: 14,
        }
      : null;

  const placed: Box[] = [peakBox];
  if (endBox) placed.push(endBox);
  const hidden = new Set<string>();
  const consider = (id: string, box: Box | null) => {
    if (!box) {
      hidden.add(id);
      return;
    }
    if (placed.some((other) => overlaps(other, box))) hidden.add(id);
    else placed.push(box);
  };
  const tickBoxes = xLabels.map((age) => {
    const label = String(age);
    const w = textWidth(label, 11);
    return { x: xOf(age) - w / 2, y: baseline + 8, w, h: 14 };
  });
  const hiddenAges = new Set<number>();
  if (endBox) {
    xLabels.forEach((age, index) => {
      if (overlaps(endBox, tickBoxes[index]!, 2)) hiddenAges.add(age);
    });
  }
  if (
    freedomBox &&
    (tickBoxes.some((tick) => overlaps(freedomBox, tick, 4)) ||
      placed.some((other) => overlaps(other, freedomBox, 4)))
  ) {
    hidden.add("freedom");
  } else if (freedomBox) {
    placed.push(freedomBox);
  } else {
    hidden.add("freedom");
  }

  const inChartHint = (spot: { h: number } | null, hint: string) =>
    !compact && spot != null && spot.h >= 52 ? hint : "";
  const aportesInHint = inChartHint(aportesSpot, aportesHint);
  const returnsInHint = inChartHint(returnsSpot, rendimentosHint);
  const saquesInHint = inChartHint(saquesSpot, saquesHint);
  const aportesBox =
    aportesSpot && aportesSpot.h >= minBand
      ? labelBox(
          aportesLabel,
          aportesInHint,
          aportesSpot.x,
          aportesSpot.y
        )
      : null;
  const returnsBox =
    returnsSpot && returnsSpot.h >= minBand
      ? labelBox(
          rendimentosLabel,
          returnsInHint,
          returnsSpot.x,
          returnsSpot.y
        )
      : null;
  const saquesBox =
    saquesSpot && saquesSpot.h >= minBand && hasCoral
      ? labelBox(
          saquesLabel,
          saquesInHint,
          saquesSpot.x,
          saquesSpot.y
        )
      : null;
  consider("rendimentos", returnsBox);
  consider("aportes", aportesBox);
  consider("saques", saquesBox);

  const hover = data.find((point) => point.age === hoverAge) ?? null;
  const onPointer = (event: PointerEvent<SVGSVGElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    if (rect.width <= 0) return;
    const px = ((event.clientX - rect.left) / rect.width) * width;
    if (px < margin.left || px > margin.left + plotW) {
      setHoverAge(null);
      return;
    }
    let lo = xMin - xPad;
    let hi = xMax + xPad;
    for (let i = 0; i < 22; i++) {
      const mid = (lo + hi) / 2;
      if (xOf(mid) < px) lo = mid;
      else hi = mid;
    }
    const age = (lo + hi) / 2;
    let nearest = data[0]!;
    let best = Infinity;
    for (const point of data) {
      const distance = Math.abs(point.age - age);
      if (distance < best) {
        best = distance;
        nearest = point;
      }
    }
    setHoverAge(nearest.age);
  };

  const clipId = `hill-clip-${rawId}`;
  const goldId = `hill-gold-${rawId}`;
  const blueId = `hill-blue-${rawId}`;
  const coralId = `hill-coral-${rawId}`;

  return (
    <figure
      className="projection-chart"
      data-chart="ProjectionChart"
      data-chart-line="patrimonio"
      data-chart-curve="monotone"
      data-chart-layout="hill"
      data-chart-area="aportes-rendimentos-saques"
      data-peak-age={peakKnot.age}
      data-end-age={endKnot.age}
      data-freedom-age={freedom ?? ""}
    >
      <div className="projection-chart-head">
        <figcaption className="projection-chart-title-block">
          <p className="projection-chart-title">{title}</p>
          <p className="projection-chart-subtitle">{subtitle}</p>
          <p className="projection-chart-description">{description}</p>
        </figcaption>
        <ul className="projection-chart-legend">
          <li data-stack="contributions">
            <span className="projection-chart-swatch" aria-hidden="true" />
            <span>
              {aportesLabel} <em>{aportesHint}</em>
            </span>
          </li>
          <li data-stack="returns">
            <span className="projection-chart-swatch" aria-hidden="true" />
            <span>
              {rendimentosLabel} <em>{rendimentosHint}</em>
            </span>
          </li>
          <li data-stack="withdrawals">
            <span className="projection-chart-swatch" aria-hidden="true" />
            <span>
              {saquesLabel} <em>{saquesHint}</em>
            </span>
          </li>
        </ul>
      </div>
      <div className="projection-chart-plot" ref={plotRef}>
        <svg
          viewBox={`0 0 ${width} ${height}`}
          role="img"
          aria-label={`${title}. ${description} ${peakTitle} ${peakDetail}. ${endTitle} ${endDetail}.`}
          onPointerMove={onPointer}
          onPointerLeave={() => setHoverAge(null)}
        >
          <defs>
            <linearGradient
              id={goldId}
              gradientUnits="userSpaceOnUse"
              x1="0"
              y1={margin.top}
              x2="0"
              y2={baseline}
            >
              <stop offset="0%" stopColor="#FBF7EE" stopOpacity="0.42" />
              <stop offset="46%" stopColor="#F0E2C0" stopOpacity="0.58" />
              <stop offset="100%" stopColor={GOLD} stopOpacity="0.7" />
            </linearGradient>
            <linearGradient
              id={blueId}
              gradientUnits="userSpaceOnUse"
              x1="0"
              y1={margin.top}
              x2="0"
              y2={baseline}
            >
              <stop offset="0%" stopColor="#F3F7FB" stopOpacity="0.38" />
              <stop offset="100%" stopColor={BLUE} stopOpacity="0.58" />
            </linearGradient>
            <linearGradient
              id={coralId}
              gradientUnits="userSpaceOnUse"
              x1="0"
              y1={margin.top}
              x2="0"
              y2={baseline}
            >
              <stop offset="0%" stopColor="#FBF4F2" stopOpacity="0.34" />
              <stop offset="100%" stopColor={CORAL} stopOpacity="0.55" />
            </linearGradient>
            <clipPath id={clipId}>
              <path d={clipD} />
            </clipPath>
          </defs>

          {yLabels
            .filter((value) => Math.abs(yOf(value) - peakY) > 16)
            .map((value) => (
            <g key={value}>
              <line
                x1={margin.left}
                x2={margin.left + plotW}
                y1={yOf(value)}
                y2={yOf(value)}
                stroke="rgba(148, 163, 175, 0.2)"
                strokeDasharray="1.5 7"
                strokeWidth="1"
              />
              <text
                x={margin.left - 8}
                y={yOf(value) + 4}
                textAnchor="end"
                fill="#9AA3A8"
                fontSize={compact ? 10 : 11}
              >
                {money(value)}
              </text>
            </g>
          ))}

          <g clipPath={`url(#${clipId})`}>
            <path d={goldD} fill={`url(#${goldId})`} data-band="rendimentos" />
            <path d={blueD} fill={`url(#${blueId})`} data-band="aportes" />
            {hasCoral ? (
              <path d={coralD} fill={`url(#${coralId})`} data-band="saques" />
            ) : null}
          </g>

          <path
            d={lineD}
            fill="none"
            stroke={LINE}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            data-wealth-line="true"
          />

          {showFreedom && freedomX != null && freedomY != null ? (
            <g data-marker="freedom">
              <line
                x1={freedomX}
                x2={freedomX}
                y1={baseline + 1}
                y2={baseline + 8}
                stroke={LINE}
                strokeWidth="1.25"
              />
              {showFreedomDot ? (
                <circle
                  cx={freedomX}
                  cy={freedomY}
                  r="3.6"
                  fill="#fff"
                  stroke={LINE}
                  strokeWidth="1.75"
                />
              ) : null}
              {hidden.has("freedom") ? null : (
                <text
                  x={freedomCenter}
                  y={baseline + 48}
                  textAnchor="middle"
                  fill={LINE}
                  fontSize="11"
                  fontWeight="600"
                >
                  {freedomText}
                </text>
              )}
            </g>
          ) : null}

          {xLabels.map((age) =>
            hiddenAges.has(age) ? null : (
              <text
                key={age}
                x={xOf(age)}
                y={baseline + 18}
                textAnchor="middle"
                fill="#9AA3A8"
                fontSize="11"
              >
                {age}
              </text>
            )
          )}

          {!compact && !hidden.has("aportes") && aportesSpot ? (
            <BandCopy
              x={aportesSpot.x}
              y={aportesSpot.y}
              fill="#4E6A82"
              title={aportesLabel}
              hint={hidden.has("aportes") ? "" : aportesInHint}
            />
          ) : null}
          {!compact && !hidden.has("rendimentos") && returnsSpot ? (
            <BandCopy
              x={returnsSpot.x}
              y={returnsSpot.y}
              fill="#8A6E3B"
              title={rendimentosLabel}
              hint={hidden.has("rendimentos") ? "" : returnsInHint}
            />
          ) : null}
          {!compact && !hidden.has("saques") && saquesSpot ? (
            <BandCopy
              x={saquesSpot.x}
              y={saquesSpot.y}
              fill="#9A625C"
              title={saquesLabel}
              hint={hidden.has("saques") ? "" : saquesInHint}
            />
          ) : null}

          <g data-marker="peak">
            <circle cx={peakX} cy={peakY} r="3.5" fill={LINE} />
            <text
              x={peakCenter}
              y={peakBox.y + 12}
              textAnchor="middle"
              fill={LINE}
              fontSize={compact ? 11 : 12}
              fontWeight="650"
            >
              <tspan x={peakCenter}>{peakTitle}</tspan>
              <tspan x={peakCenter} dy="14" fontSize={compact ? 10 : 11} fontWeight="500">
                {peakDetail}
              </tspan>
            </text>
          </g>

          {sameCrest || !endBox ? null : (
            <g data-marker="end">
              <circle
                cx={endX}
                cy={endY}
                r="4.5"
                fill="#fff"
                stroke={LINE}
                strokeWidth="1.75"
              />
              <text
                x={endPlace.x}
                y={endPlace.y + 12}
                textAnchor={endPlace.anchor}
                fill={LINE}
                fontSize={compact ? 11 : 12}
                fontWeight="650"
              >
                <tspan x={endPlace.x}>{endTitle}</tspan>
                <tspan
                  x={endPlace.x}
                  dy="14"
                  fontSize={compact ? 10 : 11}
                  fontWeight="500"
                >
                  {endDetail}
                </tspan>
              </text>
            </g>
          )}

          {hover ? (
            <g data-hover-age={hover.age}>
              <line
                x1={xOf(hover.age)}
                x2={xOf(hover.age)}
                y1={yOf(hover.patrimonio)}
                y2={baseline}
                stroke={LINE}
                strokeOpacity="0.35"
                strokeWidth="1"
              />
              <circle
                cx={xOf(hover.age)}
                cy={yOf(hover.patrimonio)}
                r="4.5"
                fill={LINE}
                stroke="#fff"
                strokeWidth="2"
              />
            </g>
          ) : null}
        </svg>
        {hover ? (
          <div
            className="projection-chart-hover landing-chart-tooltip"
            style={{
              left: `${(xOf(hover.age) / width) * 100}%`,
              top: `${(yOf(hover.patrimonio) / height) * 100}%`,
              transform:
                xOf(hover.age) > width * 0.62
                  ? "translate(-108%, -120%)"
                  : "translate(12px, -120%)",
            }}
          >
            <p className="landing-chart-tooltip-label">{ageWord(hover.age)}</p>
            <p className="landing-chart-tooltip-value">
              {patrimonioLabel} {moneyFull(hover.patrimonio)}
            </p>
            <HoverRow label={aportesLabel} value={moneyFull(hover.aportes)} color={BLUE} />
            <HoverRow
              label={rendimentosLabel}
              value={moneyFull(hover.rendimentos)}
              color={GOLD}
            />
            <HoverRow label={saquesLabel} value={moneyFull(hover.saques)} color={CORAL} />
          </div>
        ) : null}
      </div>
      <p className="projection-chart-axis-age">{axisAge}</p>
      {children}
    </figure>
  );
}

function BandCopy({
  x,
  y,
  fill,
  title,
  hint,
}: {
  x: number;
  y: number;
  fill: string;
  title: string;
  hint: string;
}) {
  return (
    <text x={x} y={hint ? y - 6 : y} textAnchor="middle" fill={fill} fontWeight="650">
      <tspan x={x} fontSize="12.5">
        {title}
      </tspan>
      {hint ? (
        <tspan x={x} dy="13" fontSize="9.5" fontWeight="500" fillOpacity="0.82">
          {hint}
        </tspan>
      ) : null}
    </text>
  );
}

function HoverRow({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}) {
  return (
    <p className="landing-chart-tooltip-row">
      <span className="landing-chart-tooltip-swatch" style={{ background: color }} />
      <span>{label}</span>
      <span>{value}</span>
    </p>
  );
}
