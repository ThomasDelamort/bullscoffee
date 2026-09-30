/** Class strings shared by manager controls, so links and buttons can look alike. */

export const FOCUS_RING =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--mgr-accent)";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md";

const VARIANTS: Record<ButtonVariant, string> = {
  primary: "bg-(--mgr-ink) text-(--mgr-cream) hover:bg-(--mgr-ink-soft)",
  secondary:
    "bg-(--mgr-surface) text-(--mgr-ink) ring-1 ring-inset ring-(--mgr-line) hover:bg-(--mgr-canvas)",
  ghost: "text-(--mgr-ink) hover:bg-(--mgr-ink)/5",
  danger: "bg-red-600 text-white hover:bg-red-700",
};

const SIZES: Record<ButtonSize, string> = {
  sm: "h-8 gap-1.5 px-3 text-xs",
  md: "h-10 gap-2 px-4 text-sm",
};

export function buttonClass(variant: ButtonVariant = "secondary", size: ButtonSize = "md"): string {
  return `inline-flex shrink-0 items-center justify-center rounded-lg font-medium whitespace-nowrap transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${FOCUS_RING} ${VARIANTS[variant]} ${SIZES[size]}`;
}

/** Input look without a width, for controls sized by their row (e.g. a w-24 quantity box). */
export const INPUT_BASE = `rounded-lg border-0 bg-(--mgr-surface) px-3 py-2 text-sm text-(--mgr-ink) ring-1 ring-inset ring-(--mgr-line) placeholder:text-(--mgr-muted)/70 focus:ring-2 focus:ring-(--mgr-accent) focus:outline-none disabled:bg-(--mgr-canvas) disabled:text-(--mgr-muted)`;

export const INPUT_CLASS = `block w-full ${INPUT_BASE}`;
