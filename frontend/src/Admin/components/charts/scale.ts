import { useLayoutEffect, useRef, useState } from "react";

/** Clean y-axis: ticks on 1/2/5 × 10ⁿ steps, from 0 to just above the max. */
export function niceScale(max: number, tickCount = 4): { top: number; ticks: number[] } {
  if (max <= 0) return { top: 1, ticks: [0, 1] };
  const rough = max / tickCount;
  const magnitude = 10 ** Math.floor(Math.log10(rough));
  const fraction = rough / magnitude;
  const step = (fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 5 ? 5 : 10) * magnitude;
  const top = Math.ceil(max / step) * step;
  const ticks = Array.from({ length: Math.round(top / step) + 1 }, (_, i) => i * step);
  return { top, ticks };
}

/** Tracks an element's content width so SVG charts can lay out in real pixels. */
export function useElementWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry) setWidth(entry.contentRect.width);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return [ref, width] as const;
}

/** Keeps a tooltip inside the chart near either edge. */
export function tooltipShift(x: number, width: number): string {
  if (x < 70) return "translateX(-12px)";
  if (x > width - 70) return "translateX(calc(-100% + 12px))";
  return "translateX(-50%)";
}
