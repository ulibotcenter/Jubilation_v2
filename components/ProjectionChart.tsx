'use client';

import { useMemo } from 'react';

type Point = {
  age: number;
  aportes: number;
  rendimentos: number;
  saques: number;
  patrimonio: number;
};

type Props = {
  data: Point[];
  currency?: string;
};

export function ProjectionChart({ data, currency = 'R$' }: Props) {
  const width = 800;
  const height = 420;
  const padding = { top: 40, right: 40, bottom: 50, left: 70 };

  const { maxY, points } = useMemo(() => {
    if (!data.length) return { maxY: 1, points: [] };
    const max = Math.max(...data.map((d) => d.patrimonio), 1);
    const chartW = width - padding.left - padding.right;
    const chartH = height - padding.top - padding.bottom;

    const pts = data.map((d, i) => {
      const x = padding.left + (i / (data.length - 1)) * chartW;
      const y = padding.top + chartH - (d.patrimonio / max) * chartH;
      return { ...d, x, y };
    });

    return { maxY: max, points: pts };
  }, [data]);

  const areaPath = (key: keyof Point) => {
    if (!points.length) return '';
    const chartH = height - padding.top - padding.bottom;
    let d = `M ${points[0].x} ${padding.top + chartH}`;
    points.forEach((p) => {
      const val = (p[key] as number) || 0;
      const y = padding.top + chartH - (val / maxY) * chartH;
      d += ` L ${p.x} ${y}`;
    });
    d += ` L ${points[points.length - 1].x} ${padding.top + chartH} Z`;
    return d;
  };

  const linePath = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
    .join(' ');

  const format = (v: number) =>
    v >= 1_000_000
      ? `${currency} ${(v / 1_000_000).toFixed(1)} mi`
      : v >= 1_000
      ? `${currency} ${(v / 1_000).toFixed(0)} mil`
      : `${currency} ${v}`;

  return (
    <div className="w-full rounded-3xl bg-white p-8 shadow-sm">
      <div className="mb-2 flex items-start justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900">
            SEU FUTURO<br />FINANCEIRO
          </h2>
          <p className="mt-3 text-sm text-slate-500">
            Patrimônio ao longo do tempo
          </p>
          <div className="mt-1 h-0.5 w-12 bg-teal-700" />
        </div>
        <div className="space-y-1.5 text-xs text-slate-600">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-sm bg-blue-300" />
            Aportes
          </div>
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-sm bg-amber-300" />
            Rendimentos
          </div>
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-sm bg-rose-300" />
            Saques
          </div>
        </div>
      </div>

      <svg viewBox={`0 0 ${width} ${height}`} className="mt-4 w-full">
        <defs>
          <linearGradient id="gAportes" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#93C5FD" stopOpacity="0.7" />
            <stop offset="100%" stopColor="#93C5FD" stopOpacity="0.05" />
          </linearGradient>
          <linearGradient id="gRend" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FCD34D" stopOpacity="0.65" />
            <stop offset="100%" stopColor="#FCD34D" stopOpacity="0.05" />
          </linearGradient>
          <linearGradient id="gSaques" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FCA5A5" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#FCA5A5" stopOpacity="0.05" />
          </linearGradient>
        </defs>

        {/* Areas */}
        <path d={areaPath('aportes')} fill="url(#gAportes)" />
        <path d={areaPath('rendimentos')} fill="url(#gRend)" />
        <path d={areaPath('saques')} fill="url(#gSaques)" />

        {/* Total line */}
        <path
          d={linePath}
          fill="none"
          stroke="#0F766E"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Peak dot */}
        {points.length > 0 && (
          <circle
            cx={points[Math.floor(points.length * 0.55)]?.x}
            cy={points[Math.floor(points.length * 0.55)]?.y}
            r="5"
            fill="#0F766E"
          />
        )}

        {/* X labels */}
        {points
          .filter((_, i) => i % Math.ceil(points.length / 6) === 0)
          .map((p) => (
            <text
              key={p.age}
              x={p.x}
              y={height - 15}
              textAnchor="middle"
              fontSize="12"
              fill="#64748B"
            >
              {p.age}
            </text>
          ))}

        {/* Y labels */}
        {[0, 0.25, 0.5, 0.75, 1].map((t) => {
          const y = padding.top + (height - padding.top - padding.bottom) * (1 - t);
          return (
            <text
              key={t}
              x={padding.left - 10}
              y={y + 4}
              textAnchor="end"
              fontSize="12"
              fill="#64748B"
            >
              {format(maxY * t)}
            </text>
          );
        })}
      </svg>
    </div>
  );
}
