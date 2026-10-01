/** Derived values several screens share. Pure functions over API rows. */
import type { AttendanceState } from "../components/status";
import type { AttendanceLog, Employee, Ingredient, Order, OrderItem, ProductIngredient } from "../types";
import { sumBy } from "../utils/collections";
import { dayKey } from "../utils/dates";
import { round2 } from "../utils/format";
import { SIZE_LABELS } from "../utils/pricing";
import { parseSchedule } from "../utils/schedule";

export type StockState = "in" | "low" | "out";

export function stockState(i: Pick<Ingredient, "current_quantity" | "minimum_stock_level">): StockState {
  if (i.current_quantity <= 0) return "out";
  return i.current_quantity <= i.minimum_stock_level ? "low" : "in";
}

/** How many of a product the current stock can make; Infinity when it has no recipe. */
export function makeableCount(
  recipe: readonly Pick<ProductIngredient, "ingredient_id" | "quantity_required">[],
  ingredients: ReadonlyMap<number, Ingredient>,
): number {
  return recipe.reduce((min, r) => {
    const onHand = ingredients.get(r.ingredient_id)?.current_quantity ?? 0;
    return Math.min(min, Math.floor(onHand / r.quantity_required));
  }, Infinity);
}

/** Only completed orders count as sales, matching the backend's sales report. */
export const isSale = (o: Pick<Order, "order_status">): boolean => o.order_status === "completed";

export interface SalesTotals {
  orders: number;
  /** Before discounts. */
  gross: number;
  discounts: number;
  net: number;
  average: number;
}

export function salesTotals(orders: readonly Order[]): SalesTotals {
  const sales = orders.filter(isSale);
  const net = round2(sumBy(sales, (o) => o.total_amount));
  const discounts = round2(sumBy(sales, (o) => o.discount_amount));
  return {
    orders: sales.length,
    gross: round2(net + discounts),
    discounts,
    net,
    average: sales.length ? round2(net / sales.length) : 0,
  };
}

/** Minutes after the scheduled start before a clock-in counts as late. */
export const LATE_GRACE_MINUTES = 10;

export function attendanceState(log: AttendanceLog, employee: Employee | undefined, now = new Date()): AttendanceState {
  if (!log.time_out) return dayKey(log.time_in) === dayKey(now) ? "on-shift" : "no-clock-out";
  const shift = employee ? parseSchedule(employee.work_schedule) : null;
  if (!shift) return "on-time";
  const [h, m] = shift.start.split(":").map(Number);
  const due = new Date(log.time_in);
  due.setHours(h!, m! + LATE_GRACE_MINUTES, 0, 0);
  return new Date(log.time_in) > due ? "late" : "on-time";
}

/** Opening hours, one entry per hour that takes orders (7 AM to 8 PM). */
export const STORE_HOURS = Array.from({ length: 14 }, (_, i) => i + 7);

/** "2× Café latte (Grande), 1× Butter croissant" */
export function describeItems(items: readonly Pick<OrderItem, "quantity" | "product_name" | "size">[]): string {
  return items.map((i) => `${i.quantity}× ${i.product_name}${i.size ? ` (${SIZE_LABELS[i.size]})` : ""}`).join(", ");
}
