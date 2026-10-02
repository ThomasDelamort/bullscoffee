import type { Discount, ItemSize, OrderItem, PaymentMethod, Product, Tender } from "../types";
import { round2 } from "./format";

interface SizeOption {
  value: ItemSize;
  label: string;
  /** Added to products.price, which is the tall price. */
  upcharge: number;
}

export const SIZES: readonly SizeOption[] = [
  { value: "tall", label: "Tall", upcharge: 0 },
  // The item_size enum spells this 'grade' in init.sql.
  { value: "grade", label: "Grande", upcharge: 20 },
  { value: "venti", label: "Venti", upcharge: 40 },
];

export const SIZE_LABELS = Object.fromEntries(SIZES.map((s) => [s.value, s.label])) as Record<ItemSize, string>;

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: "Cash",
  card: "Card",
  e_wallet: "E-wallet",
};

export const TENDER_LABELS: Record<Tender, string> = { ...PAYMENT_METHOD_LABELS, online: "Online" };

export function unitPrice(product: Pick<Product, "price">, size: ItemSize | null): number {
  const upcharge = SIZES.find((s) => s.value === size)?.upcharge ?? 0;
  return round2(product.price + upcharge);
}

export function subtotalOf(items: Pick<OrderItem, "quantity" | "selling_price">[]): number {
  return round2(items.reduce((sum, i) => sum + i.quantity * i.selling_price, 0));
}

/** Never more than the subtotal, since orders.total_amount must stay >= 0. */
export function discountFor(discount: Pick<Discount, "kind" | "value">, subtotal: number): number {
  const raw = discount.kind === "percent" ? (subtotal * discount.value) / 100 : discount.value;
  return round2(Math.min(Math.max(raw, 0), subtotal));
}

export function describeDiscount(discount: Pick<Discount, "kind" | "value">): string {
  return discount.kind === "percent" ? `${discount.value}% off` : `₱${discount.value} off`;
}

/** Bills a customer is likely to hand over for this total: exact, then the next round amounts. */
export function cashSuggestions(total: number): number[] {
  if (total <= 0) return [];
  const steps = [Math.ceil(total / 50) * 50, Math.ceil(total / 100) * 100, 500, 1000];
  const above = steps.filter((n) => n > total);
  return [total, ...new Set(above)].slice(0, 4);
}

/** Why the payment can't go through yet, or null when it can. `tendered` is the cash received, as typed. */
export function paymentProblem(total: number, method: Tender, tendered: string): string | null {
  return method === "cash" && total > 0 && (Number(tendered) || 0) < total ? "Enter the cash received." : null;
}
