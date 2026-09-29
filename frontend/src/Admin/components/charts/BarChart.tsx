import { useState } from "react";
import type { SeriesPoint } from "../../types";
import { niceScale, tooltipShift, useElementWidth } from "./scale";

interface BarChartProps {
  data: SeriesPoint[];
  label: string;
  format?: (value: number) => string;
  height?: number;
}

const PAD = { top: 16, right: 12, bottom: 28, left: 48 };
const MAX_BAR = 24;
const RADIUS = 4;

/** Rounded at the data end, square at the baseline. */
function columnPath(x: number, y: number, w: number, h: number): string {
  const r = Math.min(RADIUS, w / 2, h);
  return `M${x},${y + h} V${y + r} Q${x},${y} ${x + r},${y} H${x + w - r} Q${x + w},${y} ${x + w},${y + r} V${y + h} Z`;
}

/** Single-series column chart with a per-column hover tooltip. */
export default function BarChart({ data, label, format = String, height = 220 }: BarChartProps) {
  const [ref, width] = useElementWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);

  const { top, ticks } = niceScale(Math.max(...data.map((d) => d.value)));
  const innerW = Math.max(0, width - PAD.left - PAD.right);
  const innerH = height - PAD.top - PAD.bottom;
  const band = innerW / data.length;
  const barW = Math.min(MAX_BAR, band * 0.6);
  const y = (v: number) => PAD.top + innerH - (v / top) * innerH;
  const center = (i: number) => PAD.left + band * i + band / 2;

  const hovered = hover === null ? null : data[hover];

  return (
    <div ref={ref} className="relative" style={{ height }}>
      {width > 0 && (
        <svg width={width} height={height} role="img" aria-label={label}>
          {ticks.map((t) => (
            <g key={t}>
              <line x1={PAD.left} x2={width - PAD.right} y1={y(t)} y2={y(t)} stroke="var(--admin-grid)" />
              <text
                x={PAD.left - 8}
                y={y(t)}
                dy="0.32em"
                textAnchor="end"
                className="fill-(--admin-muted) text-[11px] tabular-nums"
              >
                {format(t)}
              </text>
            </g>
          ))}

          {data.map((d, i) => {
            const barTop = y(d.value);
            return (
              <g key={d.label}>
                <path
                  d={columnPath(center(i) - barW / 2, barTop, barW, y(0) - barTop)}
                  fill="var(--admin-chart)"
                  opacity={hover === null || hover === i ? 1 : 0.45}
                  className="transition-opacity"
                />
                <text
                  x={center(i)}
                  y={height - 8}
                  textAnchor="middle"
                  className="fill-(--admin-muted) text-[11px]"
                >
                  {d.label}
                </text>
                {/* Hit target spans the whole band, not just the thin column. */}
                <rect
                  x={PAD.left + band * i}
                  y={PAD.top}
                  width={band}
                  height={innerH}
                  fill="transparent"
                  onPointerEnter={() => setHover(i)}
                  onPointerLeave={() => setHover(null)}
                />
              </g>
            );
          })}
        </svg>
      )}

      {hovered && hover !== null && (
        <div
          className="pointer-events-none absolute rounded-lg bg-(--admin-ink) px-2.5 py-1.5 text-xs whitespace-nowrap text-(--admin-cream) shadow-lg"
          style={{ left: center(hover), top: y(hovered.value) - 40, transform: tooltipShift(center(hover), width) }}
        >
          <span className="opacity-70">{hovered.label}</span>{" "}
          <span className="font-semibold tabular-nums">{format(hovered.value)}</span>
        </div>
      )}
    </div>
  );
}
