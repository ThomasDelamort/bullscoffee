/** Derived values several screens share. Pure functions over store rows. */
import type { AttendanceState } from "../components/status";
import type {
  AttendanceLog,
  Employee,
  Ingredient,
  ManagerDb,
  Order,
  OrderItem,
  Product,
  ProductIngredient,
} from "../types";
import { groupBy, indexBy, sumBy } from "../utils/collections";
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
  recipe: readonly ProductIngredient[],
  ingredients: ReadonlyMap<number, Ingredient>,
): number {
  return recipe.reduce((min, r) => {
    const onHand = ingredients.get(r.ingredient_id)?.current_quantity ?? 0;
    return Math.min(min, Math.floor(onHand / r.quantity_required));
  }, Infinity);
}

/** Cancelled orders are not revenue; pending ones are already paid. */
export const isSale = (o: Order): boolean => o.order_status !== "cancelled";

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

export interface ProductSales {
  product_id: number;
  quantity: number;
  revenue: number;
}

/** Line revenue before order-level discounts, most sold first. */
export function productSales(items: readonly OrderItem[]): ProductSales[] {
  return [...groupBy(items, (i) => i.product_id)]
    .map(([product_id, lines]) => ({
      product_id,
      quantity: sumBy(lines, (l) => l.quantity),
      revenue: round2(sumBy(lines, (l) => l.quantity * l.selling_price)),
    }))
    .sort((a, b) => b.revenue - a.revenue);
}

/** Order items of the given orders only. */
export function itemsOf(db: Pick<ManagerDb, "order_items">, orders: readonly Order[]): OrderItem[] {
  const ids = new Set(orders.map((o) => o.order_id));
  return db.order_items.filter((i) => ids.has(i.order_id));
}

export const ordersOnDay = (orders: readonly Order[], key: string) =>
  orders.filter((o) => dayKey(o.ordered_at) === key);

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

export function lookups(db: ManagerDb) {
  return {
    employees: indexBy(db.employees, (e) => e.employee_id),
    customers: indexBy(db.customers, (c) => c.customer_id),
    products: indexBy(db.products, (p) => p.product_id),
    categories: indexBy(db.categories, (c) => c.category_id),
    ingredients: indexBy(db.ingredients, (i) => i.ingredient_id),
    suppliers: indexBy(db.suppliers, (s) => s.supplier_id),
  };
}

/** Opening hours, one entry per hour that takes orders (7 AM to 8 PM). */
export const STORE_HOURS = Array.from({ length: 14 }, (_, i) => i + 7);

/** "2× Café latte (Grande), 1× Butter croissant" */
export function describeItems(items: readonly OrderItem[], products: ReadonlyMap<number, Product>): string {
  return items
    .map((i) => {
      const name = products.get(i.product_id)?.product_name ?? `Product #${i.product_id}`;
      return `${i.quantity}× ${name}${i.size ? ` (${SIZE_LABELS[i.size]})` : ""}`;
    })
    .join(", ");
}
