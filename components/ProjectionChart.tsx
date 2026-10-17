"use client";

import { useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { PointerEvent } from "react";
import { Shield } from "lucide-react";
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
}: {
  data: ProjectionChartPoint[];
  currency?: string;
  currencyCode?: Currency;
  freedomAge?: number;
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
  const footerLabel = t("calc.freedom.chart.footer");
  const footerHint = t("calc.freedom.chart.footerHint");
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
    top: compact ? 42 : 50,
    right: compact ? 8 : Math.max(108, Math.min(140, endLabelW + 28)),
    bottom: compact ? 52 : 48,
    left: compact ? 48 : 60,
  };
  const plotW = Math.max(80, width - margin.left - margin.right);
  // The balance turns inside a single year. A tall frame draws that as a
  // spike; a low wide hill keeps every integer age on the real balance
  // and lets the crest read as a rounded top.
  const plotH = Math.round(
    compact
      ? Math.min(108, Math.max(88, plotW * 0.26))
      : Math.min(112, Math.max(100, plotW * 0.13))
  );
  const height = margin.top + plotH + margin.bottom;
  const xMin = plot[0]!.age;
  const xMax = plot.at(-1)!.age;
  const xSpan = Math.max(1, xMax - xMin);
  const yMax = Math.max(1, peakKnot.patrimonio * 1.2);
  const xPad = xSpan * 0.018;
  const xOf = (age: number) =>
    margin.left + ((age - xMin + xPad) / (xSpan + xPad * 2)) * plotW;
  const yOf = (value: number) =>
    margin.top + plotH - (Math.max(0, value) / yMax) * plotH;
  const baseline = yOf(0);

  const pts = plot.map((point) => ({
    x: xOf(point.age),
    line: yOf(point.lineY),
    blue: yOf(point.blueTop),
    coral: yOf(point.coral),
    zero: baseline,
  }));
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
    y: Math.max(2, peakY - 46),
    w: peakW,
    h: 30,
  };

  const sameCrest = peakKnot.age === endKnot.age;
  const endPlace = compact
    ? {
        x: width - 2,
        y: baseline + 16,
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
  const freedomBox: Box | null =
    showFreedom && freedomX != null
      ? {
          x: freedomX - textWidth(freedomText, 10) / 2,
          y: baseline + 28,
          w: textWidth(freedomText, 10),
          h: 12,
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
    const age = xMin - xPad + ((px - margin.left) / plotW) * (xSpan + xPad * 2);
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
              <stop offset="0%" stopColor="#E8D7AE" stopOpacity="0.82" />
              <stop offset="28%" stopColor={GOLD} stopOpacity="0.9" />
              <stop offset="100%" stopColor={GOLD} stopOpacity="0.94" />
            </linearGradient>
            <linearGradient
              id={blueId}
              gradientUnits="userSpaceOnUse"
              x1="0"
              y1={margin.top}
              x2="0"
              y2={baseline}
            >
              <stop offset="0%" stopColor="#D7E4EE" stopOpacity="0.92" />
              <stop offset="100%" stopColor={BLUE} stopOpacity="0.94" />
            </linearGradient>
            <linearGradient
              id={coralId}
              gradientUnits="userSpaceOnUse"
              x1="0"
              y1={margin.top}
              x2="0"
              y2={baseline}
            >
              <stop offset="0%" stopColor="#F6E6E3" stopOpacity="0.9" />
              <stop offset="100%" stopColor={CORAL} stopOpacity="0.94" />
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
                stroke="rgba(148, 163, 175, 0.28)"
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
            strokeWidth="2.35"
            strokeLinecap="round"
            strokeLinejoin="round"
            data-wealth-line="true"
          />

          {showFreedom && freedomX != null && freedomY != null ? (
            <g data-marker="freedom">
              <line
                x1={freedomX}
                x2={freedomX}
                y1={baseline - 0.5}
                y2={baseline + 6}
                stroke={LINE}
                strokeWidth="1.25"
              />
              <circle cx={freedomX} cy={baseline} r="2.2" fill={LINE} />
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
                  x={freedomX}
                  y={baseline + 38}
                  textAnchor="middle"
                  fill={LINE}
                  fontSize="10"
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

          {!hidden.has("aportes") && aportesSpot ? (
            <BandCopy
              x={aportesSpot.x}
              y={aportesSpot.y}
              fill="#4E6A82"
              title={aportesLabel}
              hint={hidden.has("aportes") ? "" : aportesInHint}
            />
          ) : null}
          {!hidden.has("rendimentos") && returnsSpot ? (
            <BandCopy
              x={returnsSpot.x}
              y={returnsSpot.y}
              fill="#8A6E3B"
              title={rendimentosLabel}
              hint={hidden.has("rendimentos") ? "" : returnsInHint}
            />
          ) : null}
          {!hidden.has("saques") && saquesSpot ? (
            <BandCopy
              x={saquesSpot.x}
              y={saquesSpot.y}
              fill="#9A625C"
              title={saquesLabel}
              hint={hidden.has("saques") ? "" : saquesInHint}
            />
          ) : null}

          <g data-marker="peak">
            <circle cx={peakX} cy={peakY} r="3.25" fill={LINE} stroke="#fff" strokeWidth="1.75" />
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
      <p className="projection-chart-footer">
        <Shield aria-hidden="true" />
        <span>
          <strong>{footerLabel}</strong>
          <span>{footerHint}</span>
        </span>
      </p>
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
