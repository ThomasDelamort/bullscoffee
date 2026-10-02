import type { DiscountKind } from "../types/discount.types.ts";
import type { ItemSize } from "../types/order.types.ts";

// Added to products.price, which is the tall price. Must match SIZES in
// frontend/src/POS/utils/pricing.ts, which shows these to customers.
export const SIZE_UPCHARGE: Record<ItemSize, number> = {
  tall: 0,
  grade: 20,
  venti: 40,
};

export const isItemSize = (value: unknown): value is ItemSize =>
  typeof value === "string" && Object.hasOwn(SIZE_UPCHARGE, value);

export const round2 = (value: number): number => Math.round(value * 100) / 100;

// pg returns DECIMAL columns as strings, hence the Number().
export const unitPrice = (price: number | string, size: ItemSize | null): number =>
  round2(Number(price) + (size ? SIZE_UPCHARGE[size] : 0));

// Never more than the subtotal, since orders.total_amount must stay >= 0.
// Must match discountFor in frontend/src/POS/utils/pricing.ts.
export const discountFor = (
  discount: { kind: DiscountKind; value: number | string },
  subtotal: number,
): number => {
  const value = Number(discount.value);
  const raw = discount.kind === "percent" ? (subtotal * value) / 100 : value;
  return round2(Math.min(Math.max(raw, 0), subtotal));
};
