/** Class strings shared by admin controls, so links and buttons can look alike. */

export const FOCUS_RING =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--admin-gold)";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md";

const VARIANTS: Record<ButtonVariant, string> = {
  primary: "bg-(--admin-ink) text-(--admin-cream) hover:bg-(--admin-ink-soft)",
  secondary:
    "bg-(--admin-surface) text-(--admin-ink) ring-1 ring-inset ring-(--admin-line) hover:bg-(--admin-canvas)",
  ghost: "text-(--admin-ink) hover:bg-(--admin-ink)/5",
  danger: "bg-red-600 text-white hover:bg-red-700",
};

const SIZES: Record<ButtonSize, string> = {
  sm: "h-8 gap-1.5 px-3 text-xs",
  md: "h-10 gap-2 px-4 text-sm",
};

export function buttonClass(variant: ButtonVariant = "secondary", size: ButtonSize = "md"): string {
  return `inline-flex shrink-0 items-center justify-center rounded-lg font-medium whitespace-nowrap transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${FOCUS_RING} ${VARIANTS[variant]} ${SIZES[size]}`;
}

export const INPUT_CLASS = `block w-full rounded-lg border-0 bg-(--admin-surface) px-3 py-2 text-sm text-(--admin-ink) ring-1 ring-inset ring-(--admin-line) placeholder:text-(--admin-muted)/70 focus:ring-2 focus:ring-(--admin-gold) focus:outline-none disabled:bg-(--admin-canvas) disabled:text-(--admin-muted)`;
