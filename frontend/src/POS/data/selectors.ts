import type { Order, OrderItem, OrderType, PosDb, Product } from "../types";
import { round2 } from "../utils/format";

export type OrderFilter = "all" | OrderType;

export interface OrderLine extends OrderItem {
  product: Product | undefined;
}

export function linesOf(db: PosDb, orderId: number): OrderLine[] {
  return db.order_items
    .filter((i) => i.order_id === orderId)
    .map((i) => ({ ...i, product: db.products.find((p) => p.product_id === i.product_id) }));
}

/** "2× Mocha frappé, Banana bread" */
export function itemSummary(lines: OrderLine[]): string {
  return lines
    .map((l) => `${l.quantity > 1 ? `${l.quantity}× ` : ""}${l.product?.product_name ?? "Unknown item"}`)
    .join(", ");
}

export interface DiscountUse {
  name: string;
  count: number;
  amount: number;
}

export interface ShiftSummary {
  /** Paid orders: everything not cancelled. */
  orderCount: number;
  netSales: number;
  discountTotal: number;
  discountedCount: number;
  discountsByName: DiscountUse[];
  byType: Record<OrderType, { count: number; sales: number }>;
}

export function shiftSummary(db: PosDb): ShiftSummary {
  const paid = db.orders.filter((o) => o.order_status !== "cancelled");
  const uses = new Map<string, DiscountUse>();
  for (const o of paid) {
    if (o.discount_amount <= 0) continue;
    const name = db.discounts.find((d) => d.discount_id === o.discount_id)?.discount_name ?? "Custom";
    const use = uses.get(name) ?? { name, count: 0, amount: 0 };
    uses.set(name, { name, count: use.count + 1, amount: round2(use.amount + o.discount_amount) });
  }

  const totals = (type: OrderType) => {
    const rows = paid.filter((o) => o.order_type === type);
    return { count: rows.length, sales: sum(rows, (o) => o.total_amount) };
  };

  return {
    orderCount: paid.length,
    netSales: sum(paid, (o) => o.total_amount),
    discountTotal: sum(paid, (o) => o.discount_amount),
    discountedCount: paid.filter((o) => o.discount_amount > 0).length,
    discountsByName: [...uses.values()].sort((a, b) => b.amount - a.amount),
    byType: { walk_in: totals("walk_in"), online: totals("online") },
  };
}

function sum(orders: Order[], value: (o: Order) => number): number {
  return round2(orders.reduce((total, o) => total + value(o), 0));
}
