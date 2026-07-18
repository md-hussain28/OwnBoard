"use client";

import { useId } from "react";
import { cn } from "@/lib/utils";
import type { AskChart as AskChartData } from "@/schemas/ask.schema";

/** DESIGN.md chart order: honey → teal → moss → coral → plum, then two more for headroom. */
const SERIES = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "var(--brand-info)",
  "var(--brand-amber)",
];

const nf = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 });
const numStyle = { fontVariantNumeric: "tabular-nums" } as const;

function niceMax(max: number): number {
  if (max <= 0) return 1;
  const pow = 10 ** Math.floor(Math.log10(max));
  const scaled = max / pow;
  const step = scaled <= 1 ? 1 : scaled <= 2 ? 2 : scaled <= 5 ? 5 : 10;
  return step * pow;
}

function ChartShell({ chart, children }: { chart: AskChartData; children: React.ReactNode }) {
  return (
    <figure className="rounded-xl border border-border bg-card p-4 shadow-soft">
      <figcaption className="mb-3">
        <div className="font-heading text-sm font-semibold text-foreground">{chart.title}</div>
        {chart.subtitle && <div className="text-xs text-muted-foreground">{chart.subtitle}</div>}
      </figcaption>
      {children}
    </figure>
  );
}

function Legend({ chart }: { chart: AskChartData }) {
  return (
    <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
      {chart.data.map((d, i) => (
        <li key={d.label} className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span
            className="size-2.5 shrink-0 rounded-[3px]"
            style={{ backgroundColor: SERIES[i % SERIES.length] }}
          />
          <span className="text-foreground">{d.label}</span>
          <span style={numStyle} className="text-muted-foreground">
            {nf.format(d.value)}
            {chart.unit ?? ""}
          </span>
        </li>
      ))}
    </ul>
  );
}

// ── Cartesian: bar / line / area ────────────────────────────────────────────
function Cartesian({ chart }: { chart: AskChartData }) {
  const gradId = useId();
  const W = 640;
  const H = 300;
  const pad = { left: 46, right: 18, top: 16, bottom: 46 };
  const plotW = W - pad.left - pad.right;
  const plotH = H - pad.top - pad.bottom;
  const values = chart.data.map((d) => Math.max(0, d.value));
  const max = niceMax(Math.max(...values, 0));
  const ticks = 4;
  const x = (i: number) => pad.left + (plotW * (i + 0.5)) / chart.data.length;
  const y = (v: number) => pad.top + plotH * (1 - v / max);
  const color = SERIES[1]; // teal for line/area single series

  return (
    <div className="w-full overflow-x-auto">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full min-w-[420px]"
        role="img"
        aria-label={`${chart.type} chart: ${chart.title}`}
      >
        <title>{chart.title}</title>
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.28" />
            <stop offset="100%" stopColor={color} stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {/* gridlines + y labels */}
        {Array.from({ length: ticks + 1 }, (_, t) => {
          const v = (max / ticks) * t;
          const gy = y(v);
          return (
            <g key={t}>
              <line
                x1={pad.left}
                x2={W - pad.right}
                y1={gy}
                y2={gy}
                stroke="var(--border)"
                strokeWidth={1}
                strokeDasharray={t === 0 ? undefined : "3 4"}
              />
              <text
                x={pad.left - 8}
                y={gy + 3}
                textAnchor="end"
                style={numStyle}
                className="fill-muted-foreground text-xs"
              >
                {nf.format(v)}
              </text>
            </g>
          );
        })}

        {/* area / line */}
        {(chart.type === "area" || chart.type === "line") && (
          <>
            {chart.type === "area" && (
              <polygon
                fill={`url(#${gradId})`}
                points={`${x(0)},${y(0)} ${chart.data
                  .map((d, i) => `${x(i)},${y(Math.max(0, d.value))}`)
                  .join(" ")} ${x(chart.data.length - 1)},${y(0)}`}
              />
            )}
            <polyline
              fill="none"
              stroke={color}
              strokeWidth={2.5}
              strokeLinejoin="round"
              strokeLinecap="round"
              points={chart.data.map((d, i) => `${x(i)},${y(Math.max(0, d.value))}`).join(" ")}
            />
            {chart.data.map((d, i) => (
              <circle key={d.label} cx={x(i)} cy={y(Math.max(0, d.value))} r={3.5} fill={color}>
                <title>{`${d.label}: ${nf.format(d.value)}${chart.unit ?? ""}`}</title>
              </circle>
            ))}
          </>
        )}

        {/* bars */}
        {chart.type === "bar" &&
          chart.data.map((d, i) => {
            const bw = Math.min(48, (plotW / chart.data.length) * 0.6);
            const bx = x(i) - bw / 2;
            const by = y(Math.max(0, d.value));
            const bh = pad.top + plotH - by;
            return (
              <rect
                key={d.label}
                x={bx}
                y={by}
                width={bw}
                height={Math.max(0, bh)}
                rx={4}
                fill={SERIES[i % SERIES.length]}
                className="cursor-default transition-opacity hover:opacity-75"
              >
                <title>{`${d.label}: ${nf.format(d.value)}${chart.unit ?? ""}`}</title>
              </rect>
            );
          })}

        {/* x labels */}
        {chart.data.map((d, i) => (
          <text
            key={d.label}
            x={x(i)}
            y={H - pad.bottom + 16}
            textAnchor="middle"
            className="fill-muted-foreground text-xs"
          >
            {d.label.length > 12 ? `${d.label.slice(0, 11)}…` : d.label}
          </text>
        ))}
      </svg>
    </div>
  );
}

// ── Pie / donut ─────────────────────────────────────────────────────────────
function polar(cx: number, cy: number, r: number, angle: number) {
  return [cx + r * Math.cos(angle), cy + r * Math.sin(angle)] as const;
}

function PieChart({ chart }: { chart: AskChartData }) {
  const size = 220;
  const cx = size / 2;
  const cy = size / 2;
  const r = 96;
  const inner = chart.type === "donut" ? 52 : 0;
  const total = chart.data.reduce((s, d) => s + Math.max(0, d.value), 0) || 1;
  let start = -Math.PI / 2;

  return (
    <div className="flex flex-col items-center gap-2 sm:flex-row sm:items-center sm:gap-6">
      <svg
        viewBox={`0 0 ${size} ${size}`}
        className="h-44 w-44 shrink-0"
        role="img"
        aria-label={`${chart.type} chart: ${chart.title}`}
      >
        <title>{chart.title}</title>
        {chart.data.map((d, i) => {
          const frac = Math.max(0, d.value) / total;
          const end = start + frac * Math.PI * 2;
          const large = end - start > Math.PI ? 1 : 0;
          const [x0, y0] = polar(cx, cy, r, start);
          const [x1, y1] = polar(cx, cy, r, end);
          const path =
            inner > 0
              ? `M ${polar(cx, cy, inner, start).join(" ")} L ${x0} ${y0} A ${r} ${r} 0 ${large} 1 ${x1} ${y1} L ${polar(cx, cy, inner, end).join(" ")} A ${inner} ${inner} 0 ${large} 0 ${polar(cx, cy, inner, start).join(" ")} Z`
              : `M ${cx} ${cy} L ${x0} ${y0} A ${r} ${r} 0 ${large} 1 ${x1} ${y1} Z`;
          start = end;
          return (
            <path
              key={d.label}
              d={path}
              fill={SERIES[i % SERIES.length]}
              stroke="var(--card)"
              strokeWidth={1.5}
              className="cursor-default transition-opacity hover:opacity-75"
            >
              <title>{`${d.label}: ${nf.format(d.value)} (${Math.round(frac * 100)}%)`}</title>
            </path>
          );
        })}
        {inner > 0 && (
          <text
            x={cx}
            y={cy + 4}
            textAnchor="middle"
            style={numStyle}
            className="fill-foreground text-sm font-semibold"
          >
            {nf.format(total)}
          </text>
        )}
      </svg>
      <div className="min-w-0 flex-1">
        <Legend chart={chart} />
      </div>
    </div>
  );
}

// ── Radar ───────────────────────────────────────────────────────────────────
function RadarChart({ chart }: { chart: AskChartData }) {
  const size = 240;
  const cx = size / 2;
  const cy = size / 2;
  const r = 88;
  const n = chart.data.length;
  const max = niceMax(Math.max(...chart.data.map((d) => Math.max(0, d.value)), 0));
  const angleAt = (i: number) => -Math.PI / 2 + (i / n) * Math.PI * 2;
  const point = (i: number, v: number) => polar(cx, cy, (Math.max(0, v) / max) * r, angleAt(i));

  return (
    <div className="flex justify-center">
      <svg
        viewBox={`0 0 ${size} ${size}`}
        className="h-56 w-56"
        role="img"
        aria-label={`radar chart: ${chart.title}`}
      >
        <title>{chart.title}</title>
        {[0.25, 0.5, 0.75, 1].map((ring) => (
          <polygon
            key={ring}
            points={chart.data
              .map((_, i) => polar(cx, cy, r * ring, angleAt(i)).join(","))
              .join(" ")}
            fill="none"
            stroke="var(--border)"
            strokeWidth={1}
          />
        ))}
        {chart.data.map((d, i) => {
          const [ex, ey] = polar(cx, cy, r, angleAt(i));
          return (
            <line
              key={d.label}
              x1={cx}
              y1={cy}
              x2={ex}
              y2={ey}
              stroke="var(--border)"
              strokeWidth={1}
            />
          );
        })}
        <polygon
          points={chart.data.map((d, i) => point(i, d.value).join(",")).join(" ")}
          fill="var(--chart-2)"
          fillOpacity={0.22}
          stroke="var(--chart-2)"
          strokeWidth={2}
        />
        {chart.data.map((d, i) => {
          const [px, py] = point(i, d.value);
          const [lx, ly] = polar(cx, cy, r + 14, angleAt(i));
          return (
            <g key={d.label}>
              <circle cx={px} cy={py} r={3} fill="var(--chart-2)">
                <title>{`${d.label}: ${nf.format(d.value)}`}</title>
              </circle>
              <text
                x={lx}
                y={ly}
                textAnchor="middle"
                dominantBaseline="middle"
                className="fill-muted-foreground text-xs"
              >
                {d.label.length > 10 ? `${d.label.slice(0, 9)}…` : d.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export function AskChart({ chart, className }: { chart: AskChartData; className?: string }) {
  const body =
    chart.type === "pie" || chart.type === "donut" ? (
      <PieChart chart={chart} />
    ) : chart.type === "radar" ? (
      <RadarChart chart={chart} />
    ) : (
      <>
        <Cartesian chart={chart} />
        {chart.unit && (
          <div className="mt-1 text-right text-xs text-muted-foreground">in {chart.unit}</div>
        )}
      </>
    );

  return (
    <div className={cn(className)}>
      <ChartShell chart={chart}>{body}</ChartShell>
    </div>
  );
}
