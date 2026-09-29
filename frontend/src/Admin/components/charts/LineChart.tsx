import { useState, type PointerEvent } from "react";
import type { SeriesPoint } from "../../types";
import { niceScale, tooltipShift, useElementWidth } from "./scale";

interface LineChartProps {
  data: SeriesPoint[];
  /** Accessible summary of what the chart shows. */
  label: string;
  format?: (value: number) => string;
  height?: number;
  /** Show every nth x-axis label. */
  xLabelEvery?: number;
}

const PAD = { top: 16, right: 52, bottom: 28, left: 48 };

/** Single-series line with a 10% area wash, crosshair and tooltip. */
export default function LineChart({
  data,
  label,
  format = String,
  height = 220,
  xLabelEvery = 4,
}: LineChartProps) {
  const [ref, width] = useElementWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);

  const { top, ticks } = niceScale(Math.max(...data.map((d) => d.value)));
  const innerW = Math.max(0, width - PAD.left - PAD.right);
  const innerH = height - PAD.top - PAD.bottom;
  const last = data.length - 1;
  const x = (i: number) => PAD.left + (last === 0 ? innerW / 2 : (i / last) * innerW);
  const y = (v: number) => PAD.top + innerH - (v / top) * innerH;

  const line = data.map((d, i) => `${i ? "L" : "M"}${x(i)},${y(d.value)}`).join(" ");
  const area = `${line} L${x(last)},${y(0)} L${x(0)},${y(0)} Z`;

  const onMove = (e: PointerEvent<SVGRectElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    setHover(Math.round(ratio * last));
  };

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
          {data.map((d, i) =>
            i % xLabelEvery === 0 || i === last ? (
              <text
                key={d.label}
                x={x(i)}
                y={height - 8}
                textAnchor="middle"
                className="fill-(--admin-muted) text-[11px]"
              >
                {d.label}
              </text>
            ) : null,
          )}

          <path d={area} fill="var(--admin-chart)" fillOpacity={0.1} />
          <path
            d={line}
            fill="none"
            stroke="var(--admin-chart)"
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
          />

          {/* Endpoint: the one value worth labeling directly. */}
          <circle cx={x(last)} cy={y(data[last]!.value)} r={4} fill="var(--admin-chart)" stroke="var(--admin-surface)" strokeWidth={2} />
          <text
            x={x(last) + 10}
            y={y(data[last]!.value)}
            dy="0.32em"
            className="fill-(--admin-ink) text-[11px] font-semibold tabular-nums"
          >
            {format(data[last]!.value)}
          </text>

          {hovered && hover !== null && (
            <g pointerEvents="none">
              <line x1={x(hover)} x2={x(hover)} y1={PAD.top} y2={PAD.top + innerH} stroke="var(--admin-muted)" strokeOpacity={0.4} />
              <circle cx={x(hover)} cy={y(hovered.value)} r={5} fill="var(--admin-chart)" stroke="var(--admin-surface)" strokeWidth={2} />
            </g>
          )}

          <rect
            x={PAD.left}
            y={PAD.top}
            width={innerW}
            height={innerH}
            fill="transparent"
            onPointerMove={onMove}
            onPointerLeave={() => setHover(null)}
          />
        </svg>
      )}

      {hovered && hover !== null && (
        <div
          className="pointer-events-none absolute rounded-lg bg-(--admin-ink) px-2.5 py-1.5 text-xs whitespace-nowrap text-(--admin-cream) shadow-lg"
          style={{ left: x(hover), top: y(hovered.value) - 44, transform: tooltipShift(x(hover), width) }}
        >
          <span className="opacity-70">{hovered.label}</span>{" "}
          <span className="font-semibold tabular-nums">{format(hovered.value)}</span>
        </div>
      )}
    </div>
  );
}
