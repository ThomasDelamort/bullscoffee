import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ApiError, isClientError } from "../../lib/api";
import { useApi } from "../../lib/apiContext";
import type { ItemSize, OrderItem } from "../../POS/types";
import { kioskKeys } from "./menu";

/**
 * The body of POST /api/kiosk/orders. No prices, customer or payment: the
 * backend prices each line from the menu, links the order to the signed-in
 * customer (if any) from their session, and leaves it pending for the counter.
 */
export interface KioskOrderDraft {
  items: Pick<OrderItem, "product_id" | "quantity" | "size" | "special_instructions">[];
  /** Ask for a PayMongo checkout to pay at once instead of at the counter. */
  pay_online?: boolean;
}

export interface PlacedItem {
  order_item_id: number;
  product_name: string;
  quantity: number;
  size: ItemSize | null;
  /** Per unit, as the backend priced it. */
  selling_price: number;
  special_instructions: string | null;
}

export interface PlacedOrder {
  order_id: number;
  ordered_at: string;
  total_amount: number;
  items: PlacedItem[];
  /** Where to send the customer to pay; null when paying at the counter, or when online payment couldn't start. */
  checkout_url: string | null;
}

// pg sends DECIMAL columns as strings ("120.00").
const toPlacedOrder = (o: PlacedOrder): PlacedOrder => ({
  ...o,
  total_amount: Number(o.total_amount),
  items: o.items.map((i) => ({ ...i, selling_price: Number(i.selling_price) })),
});

/**
 * Places the order as pending and unpaid. The customer either pays online
 * through the checkout_url it comes back with, or gives the cashier its
 * number and pays at the counter.
 */
export function usePlaceKioskOrder() {
  const api = useApi();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (draft: KioskOrderDraft) => toPlacedOrder(await api.post<PlacedOrder>("/kiosk/orders", draft)),
    onError: (error) => {
      // 409: something sold out or changed since the menu loaded. Refresh it so the tiles show why.
      if (error instanceof ApiError && error.status === 409) {
        void queryClient.invalidateQueries({ queryKey: kioskKeys.menu });
      }
    },
  });
}

/** The backend's own words when it turned the order down; a generic line when it couldn't be reached. */
export function placeOrderError(error: unknown): string {
  return isClientError(error) && error instanceof Error
    ? error.message
    : "We couldn't send your order. Please try again, or order at the counter.";
}
