import type { Discount, ItemSize, OrderItem, Product } from "../types";
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

export const SIZE_LABELS = Object.fromEntries(SIZES.map((s) => [s.value, s.label])) as Record<
  ItemSize,
  string
>;

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
