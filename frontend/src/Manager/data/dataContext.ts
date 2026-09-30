import { createContext, useContext } from "react";
import type { DeliveryItem, ManagerDb, OrderItem, PaymentMethod, StockMovement } from "../types";

export interface OrderDraft {
  customer_id: number | null;
  items: Omit<OrderItem, "order_item_id" | "order_id">[];
  discount_amount: number;
  payment_method: PaymentMethod;
}

export type MovementDraft = Pick<StockMovement, "ingredient_id" | "quantity_change" | "reason">;

export interface DeliveryDraft {
  supplier_id: number;
  delivery_date: string;
  items: Omit<DeliveryItem, "delivery_id">[];
}

export interface ManagerStore {
  db: ManagerDb;
  /** Single-table write; multi-table writes go through the actions below. */
  update: <K extends keyof ManagerDb>(table: K, fn: (rows: ManagerDb[K]) => ManagerDb[K]) => void;
  /** Creates a pending, paid order and returns its order_id. */
  placeOrder: (draft: OrderDraft) => number;
  /** Marks a pending order completed and deducts its recipe from stock. */
  completeOrder: (orderId: number) => void;
  cancelOrder: (orderId: number) => void;
  recordMovement: (draft: MovementDraft) => void;
  recordDelivery: (draft: DeliveryDraft) => void;
}

export const ManagerDataContext = createContext<ManagerStore | null>(null);

export function useManagerData(): ManagerStore {
  const store = useContext(ManagerDataContext);
  if (!store) throw new Error("useManagerData must be used inside <ManagerDataProvider>");
  return store;
}
