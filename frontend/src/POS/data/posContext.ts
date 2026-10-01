import { createContext, useContext } from "react";
import type { Order, OrderItem, PaymentMethod, PosDb } from "../types";

export interface OrderDraft {
  customer_id: number | null;
  items: Omit<OrderItem, "order_item_id" | "order_id">[];
  discount_id: number | null;
  discount_amount: number;
  payment_method: PaymentMethod;
}

export interface PosStore {
  db: PosDb;
  /** Rings up a paid walk-in order as pending and returns its order_id. */
  placeOrder: (draft: OrderDraft) => number;
  /** Hands the order over: pending → completed. */
  completeOrder: (orderId: Order["order_id"]) => void;
  cancelOrder: (orderId: Order["order_id"]) => void;
}

export const PosDataContext = createContext<PosStore | null>(null);

export function usePosData(): PosStore {
  const store = useContext(PosDataContext);
  if (!store) throw new Error("usePosData must be used inside <PosDataProvider>");
  return store;
}
