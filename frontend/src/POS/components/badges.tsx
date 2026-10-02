import type { OrderSource, OrderStatus } from "../types";
import { SOURCE, STATUS } from "./status";

const LABEL = "inline-flex items-center gap-1 text-xs font-medium whitespace-nowrap";

export function OrderSourceBadge({ source }: { source: OrderSource }) {
  const { label, icon: Icon, color } = SOURCE[source];
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
