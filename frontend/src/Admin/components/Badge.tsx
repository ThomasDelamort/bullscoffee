import type { ReactNode } from "react";

export type Tone = "neutral" | "success" | "warning" | "danger" | "info" | "gold";

const TONES: Record<Tone, { chip: string; dot: string }> = {
  neutral: { chip: "bg-stone-100 text-stone-700 ring-stone-200", dot: "bg-stone-400" },
  success: { chip: "bg-emerald-50 text-emerald-800 ring-emerald-200", dot: "bg-emerald-500" },
  warning: { chip: "bg-amber-50 text-amber-800 ring-amber-200", dot: "bg-amber-500" },
  danger: { chip: "bg-red-50 text-red-700 ring-red-200", dot: "bg-red-500" },
  info: { chip: "bg-sky-50 text-sky-800 ring-sky-200", dot: "bg-sky-500" },
  gold: { chip: "bg-(--admin-gold)/15 text-(--admin-ink) ring-(--admin-gold)/40", dot: "bg-(--admin-gold)" },
};

interface BadgeProps {
  tone?: Tone;
  /** Leading status dot; the label always carries the meaning too. */
  dot?: boolean;
  children: ReactNode;
}

export default function Badge({ tone = "neutral", dot = false, children }: BadgeProps) {
  const { chip, dot: dotColor } = TONES[tone];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap ring-1 ring-inset ${chip}`}
    >
      {dot && <span aria-hidden className={`size-1.5 rounded-full ${dotColor}`} />}
      {children}
    </span>
  );
}
