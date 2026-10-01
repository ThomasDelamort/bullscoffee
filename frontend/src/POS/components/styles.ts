/** Class strings shared by POS controls, so links and buttons can look alike. */

export const FOCUS_RING =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--pos-gold)";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

const VARIANTS: Record<ButtonVariant, string> = {
  primary: "bg-(--pos-gold) text-(--pos-canvas) hover:bg-(--pos-gold-soft)",
  secondary: "bg-white/[0.06] text-(--pos-ink) hover:bg-white/10",
  ghost: "text-(--pos-muted) hover:bg-white/5 hover:text-(--pos-ink)",
  danger: "bg-red-500/15 text-red-300 ring-1 ring-inset ring-red-400/30 hover:bg-red-500/25",
};

const SIZES: Record<ButtonSize, string> = {
  sm: "h-8 gap-1.5 px-3 text-xs",
  md: "h-10 gap-2 px-4 text-sm",
  lg: "h-12 gap-2 px-5 text-base",
};

export function buttonClass(variant: ButtonVariant = "secondary", size: ButtonSize = "md"): string {
  return `inline-flex shrink-0 items-center justify-center rounded-lg font-semibold whitespace-nowrap transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${FOCUS_RING} ${VARIANTS[variant]} ${SIZES[size]}`;
}

export const INPUT_CLASS =
  "block w-full rounded-lg border-0 bg-white/[0.04] px-3 py-2 text-sm text-(--pos-ink) ring-1 ring-inset ring-white/[0.08] placeholder:text-(--pos-muted)/70 focus:ring-2 focus:ring-(--pos-gold) focus:outline-none";

/** Segmented-control button: pass whether it's the selected option. */
export function segmentClass(selected: boolean): string {
  return `rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${FOCUS_RING} ${
    selected ? "bg-white/10 text-(--pos-ink)" : "text-(--pos-muted) hover:text-(--pos-ink)"
  }`;
}
