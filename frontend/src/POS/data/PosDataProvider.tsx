import { useCallback, useMemo, useState, type ReactNode } from "react";
import type { Order, OrderStatus, PosDb } from "../types";
import { round2 } from "../utils/format";
import { subtotalOf } from "../utils/pricing";
import { CURRENT_CASHIER_ID, createSeed } from "./mock";
import { PosDataContext, type OrderDraft, type PosStore } from "./posContext";

const nextId = <T,>(rows: T[], id: (row: T) => number): number => rows.reduce((max, r) => Math.max(max, id(r)), 0) + 1;

export default function PosDataProvider({ children }: { children: ReactNode }) {
  const [db, setDb] = useState<PosDb>(createSeed);

  const placeOrder = useCallback(
    (draft: OrderDraft): number => {
      const order_id = nextId(db.orders, (o) => o.order_id);
      const now = new Date().toISOString();
      setDb((d) => {
        let itemId = nextId(d.order_items, (i) => i.order_item_id);
        const items = draft.items.map((i) => ({ ...i, order_item_id: itemId++, order_id }));
        const total_amount = round2(subtotalOf(items) - draft.discount_amount);
        const order: Order = {
          order_id,
          customer_id: draft.customer_id,
          employee_id: CURRENT_CASHIER_ID,
          ordered_at: now,
          discount_amount: draft.discount_amount,
          total_amount,
          order_status: "pending",
          order_type: "walk_in",
          discount_id: draft.discount_id,
        };
        return {
          ...d,
          orders: [...d.orders, order],
          order_items: [...d.order_items, ...items],
          // CHECK (amount_paid > 0): a fully discounted order has nothing to pay.
          payments:
            total_amount > 0
              ? [
                  ...d.payments,
                  {
                    payment_id: nextId(d.payments, (p) => p.payment_id),
                    order_id,
                    amount_paid: total_amount,
                    payment_method: draft.payment_method,
                    paid_at: now,
                  },
                ]
              : d.payments,
        };
      });
      return order_id;
    },
    [db.orders],
  );

  const setStatus = useCallback((orderId: number, order_status: OrderStatus) => {
    setDb((d) => ({
      ...d,
      orders: d.orders.map((o) =>
        o.order_id === orderId && o.order_status === "pending" ? { ...o, order_status } : o,
      ),
    }));
  }, []);

  const store = useMemo<PosStore>(
    () => ({
      db,
      placeOrder,
      completeOrder: (id) => setStatus(id, "completed"),
      cancelOrder: (id) => setStatus(id, "cancelled"),
    }),
    [db, placeOrder, setStatus],
  );

  return <PosDataContext.Provider value={store}>{children}</PosDataContext.Provider>;
}
