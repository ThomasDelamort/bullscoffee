import type { OrderItem } from "../../POS/types";
import { subtotalOf } from "../../POS/utils/pricing";

/** Shaped like the body of POST /api/orders, minus the payment: kiosk orders are paid at the counter. */
export interface KioskOrderDraft {
  /** The signed-in customer, or null for a guest. */
  customer_id: number | null;
  items: Omit<OrderItem, "order_item_id" | "order_id">[];
}

export interface PlacedOrder {
  order_id: number;
  ordered_at: string;
  total_amount: number;
}

let lastOrderId = 0;

/**
 * Places a kiosk order as pending and unpaid; the cashier finds it by its
 * number and takes payment at the counter.
 *
 * Mock for now. The real call is POST /api/orders with this draft and no
 * payment (the backend then leaves it pending), but that route only accepts
 * a signed-in employee and orders.employee_id is NOT NULL, so the backend
 * needs a kiosk path before guests can order for real.
 */
export function placeKioskOrder(draft: KioskOrderDraft): Promise<PlacedOrder> {
  lastOrderId += 1;
  return Promise.resolve({
    order_id: lastOrderId,
    ordered_at: new Date().toISOString(),
    total_amount: subtotalOf(draft.items),
  });
}
