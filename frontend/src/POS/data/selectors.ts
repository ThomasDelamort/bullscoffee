import { localDay } from "../api/orders";
import type { Order, OrderSource } from "../types";
import { round2 } from "../utils/format";

export type OrderFilter = "all" | OrderSource;

/** Paid in full. A kiosk order isn't until it's charged at the counter. */
export const isPaid = (order: Pick<Order, "balance_due">): boolean => order.balance_due <= 0;

/** "2× Mocha frappé, Banana bread" */
export function itemSummary(order: Pick<Order, "item_summary">): string {
  return order.item_summary
    .map((l) => `${l.quantity > 1 ? `${l.quantity}× ` : ""}${l.product_name}`)
    .join(", ");
}

export interface DiscountUse {
  name: string;
  count: number;
  amount: number;
}

export interface ShiftSummary {
  /** Paid, not cancelled, and placed today. */
  orderCount: number;
  netSales: number;
  discountTotal: number;
  discountedCount: number;
  discountsByName: DiscountUse[];
  bySource: Record<OrderSource, { count: number; sales: number }>;
}

export function shiftSummary(orders: Order[], today: string): ShiftSummary {
  const sold = orders.filter(
    (o) => o.order_status !== "cancelled" && isPaid(o) && localDay(new Date(o.ordered_at)) === today,
  );
  const uses = new Map<string, DiscountUse>();
  for (const o of sold) {
    if (o.discount_amount <= 0) continue;
    const name = o.discount_name ?? "Custom";
    const use = uses.get(name) ?? { name, count: 0, amount: 0 };
    uses.set(name, { name, count: use.count + 1, amount: round2(use.amount + o.discount_amount) });
  }

  const totals = (source: OrderSource) => {
    const rows = sold.filter((o) => o.order_source === source);
    return { count: rows.length, sales: sum(rows, (o) => o.total_amount) };
  };

  return {
    orderCount: sold.length,
    netSales: sum(sold, (o) => o.total_amount),
    discountTotal: sum(sold, (o) => o.discount_amount),
    discountedCount: sold.filter((o) => o.discount_amount > 0).length,
    discountsByName: [...uses.values()].sort((a, b) => b.amount - a.amount),
    bySource: { counter: totals("counter"), kiosk: totals("kiosk") },
  };
}

function sum(orders: Order[], value: (o: Order) => number): number {
  return round2(orders.reduce((total, o) => total + value(o), 0));
}
