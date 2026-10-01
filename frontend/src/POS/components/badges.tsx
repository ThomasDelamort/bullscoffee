import { LuGlobe, LuStore } from "react-icons/lu";
import type { OrderStatus, OrderType } from "../types";

const TYPE = {
  walk_in: { label: "Walk-in", icon: LuStore, color: "text-(--pos-muted)" },
  online: { label: "Online", icon: LuGlobe, color: "text-(--pos-sky)" },
} as const;

const STATUS = {
  pending: { label: "Pending", color: "text-amber-300", dot: "bg-amber-300" },
  completed: { label: "Completed", color: "text-emerald-300", dot: "bg-emerald-300" },
  cancelled: { label: "Cancelled", color: "text-(--pos-muted)", dot: "bg-(--pos-muted)" },
} as const;

const LABEL = "inline-flex items-center gap-1 text-xs font-medium whitespace-nowrap";

export function OrderTypeBadge({ type }: { type: OrderType }) {
  const { label, icon: Icon, color } = TYPE[type];
  return (
    <span className={`${LABEL} ${color}`}>
      <Icon aria-hidden className="size-3.5" />
      {label}
    </span>
  );
}

export function StatusBadge({ status }: { status: OrderStatus }) {
  const { label, color, dot } = STATUS[status];
  return (
    <span className={`${LABEL} ${color}`}>
      <span aria-hidden className={`size-1.5 rounded-full ${dot}`} />
      {label}
    </span>
  );
}
