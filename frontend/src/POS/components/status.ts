import { LuStore, LuTablet } from "react-icons/lu";

/** How each order source is labelled and colored across the register. */
export const SOURCE = {
  counter: { label: "Counter", icon: LuStore, color: "text-(--pos-muted)" },
  kiosk: { label: "Kiosk", icon: LuTablet, color: "text-(--pos-sky)" },
} as const;

export const STATUS = {
  pending: { label: "Pending", color: "text-amber-300", dot: "bg-amber-300" },
  completed: { label: "Completed", color: "text-emerald-300", dot: "bg-emerald-300" },
  cancelled: { label: "Cancelled", color: "text-(--pos-muted)", dot: "bg-(--pos-muted)" },
} as const;
