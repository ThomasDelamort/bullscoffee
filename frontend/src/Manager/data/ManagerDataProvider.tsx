import { useCallback, useState, type ReactNode } from "react";
import type { ManagerDb, StockMovement } from "../types";
import { groupBy, nextId } from "../utils/collections";
import { round2 } from "../utils/format";
import { subtotalOf } from "../utils/pricing";
import {
  ManagerDataContext,
  type DeliveryDraft,
  type ManagerStore,
  type MovementDraft,
  type OrderDraft,
} from "./dataContext";
import { CURRENT_EMPLOYEE_ID, createSeed } from "./mock";

type NewMovement = Omit<StockMovement, "movement_id">;

/** Appends movements and keeps ingredients.current_quantity equal to their running sum. */
function applyMovements(d: ManagerDb, moves: NewMovement[]): ManagerDb {
  let id = nextId(d.stock_movements, (m) => m.movement_id);
  const delta = new Map<number, number>();
  for (const m of moves) delta.set(m.ingredient_id, (delta.get(m.ingredient_id) ?? 0) + m.quantity_change);
  return {
    ...d,
    stock_movements: [...d.stock_movements, ...moves.map((m) => ({ ...m, movement_id: id++ }))],
    ingredients: d.ingredients.map((i) => {
      const change = delta.get(i.ingredient_id);
      // CHECK (current_quantity >= 0): stock never goes negative.
      return change === undefined ? i : { ...i, current_quantity: round2(Math.max(0, i.current_quantity + change)) };
    }),
  };
}

/** Total of each ingredient an order's recipes use. */
function recipeUsage(d: ManagerDb, orderId: number): Map<number, number> {
  const recipes = groupBy(d.product_ingredients, (r) => r.product_id);
  const usage = new Map<number, number>();
  for (const item of d.order_items) {
    if (item.order_id !== orderId) continue;
    for (const r of recipes.get(item.product_id) ?? []) {
      usage.set(r.ingredient_id, (usage.get(r.ingredient_id) ?? 0) + r.quantity_required * item.quantity);
    }
  }
  return usage;
}

export default function ManagerDataProvider({ children }: { children: ReactNode }) {
  const [db, setDb] = useState<ManagerDb>(createSeed);

  const update = useCallback<ManagerStore["update"]>((table, fn) => {
    setDb((d) => ({ ...d, [table]: fn(d[table]) }));
  }, []);

  const placeOrder = (draft: OrderDraft): number => {
    const order_id = nextId(db.orders, (o) => o.order_id);
    const now = new Date().toISOString();
    setDb((d) => {
      let itemId = nextId(d.order_items, (i) => i.order_item_id);
      const items = draft.items.map((i) => ({ ...i, order_item_id: itemId++, order_id }));
      const total = round2(subtotalOf(items) - draft.discount_amount);
      return {
        ...d,
        orders: [
          ...d.orders,
          {
            order_id,
            customer_id: draft.customer_id,
            employee_id: CURRENT_EMPLOYEE_ID,
            ordered_at: now,
            discount_amount: draft.discount_amount,
            total_amount: total,
            order_status: "pending",
          },
        ],
        order_items: [...d.order_items, ...items],
        // CHECK (amount_paid > 0): a fully discounted order has nothing to pay.
        payments:
          total > 0
            ? [
                ...d.payments,
                {
                  payment_id: nextId(d.payments, (p) => p.payment_id),
                  order_id,
                  amount_paid: total,
                  payment_method: draft.payment_method,
                  paid_at: now,
                },
              ]
            : d.payments,
      };
    });
    return order_id;
  };

  const completeOrder = (orderId: number) => {
    const now = new Date().toISOString();
    setDb((d) => {
      const order = d.orders.find((o) => o.order_id === orderId);
      if (order?.order_status !== "pending") return d;
      const moves: NewMovement[] = [...recipeUsage(d, orderId)].map(([ingredient_id, used]) => ({
        ingredient_id,
        employee_id: CURRENT_EMPLOYEE_ID,
        quantity_change: -round2(used),
        reason: "sale",
        moved_at: now,
      }));
      const completed: ManagerDb = {
        ...d,
        orders: d.orders.map((o) => (o.order_id === orderId ? { ...o, order_status: "completed" } : o)),
      };
      return applyMovements(completed, moves);
    });
  };

  const cancelOrder = (orderId: number) => {
    setDb((d) => ({
      ...d,
      orders: d.orders.map((o) =>
        o.order_id === orderId && o.order_status === "pending" ? { ...o, order_status: "cancelled" } : o,
      ),
    }));
  };

  const recordMovement = (draft: MovementDraft) => {
    const moved_at = new Date().toISOString();
    setDb((d) => applyMovements(d, [{ ...draft, employee_id: CURRENT_EMPLOYEE_ID, moved_at }]));
  };

  const recordDelivery = (draft: DeliveryDraft) => {
    const moved_at = new Date().toISOString();
    setDb((d) => {
      const delivery_id = nextId(d.deliveries, (x) => x.delivery_id);
      const received: ManagerDb = {
        ...d,
        deliveries: [
          ...d.deliveries,
          { delivery_id, supplier_id: draft.supplier_id, employee_id: CURRENT_EMPLOYEE_ID, delivery_date: draft.delivery_date },
        ],
        delivery_items: [...d.delivery_items, ...draft.items.map((i) => ({ ...i, delivery_id }))],
      };
      return applyMovements(
        received,
        draft.items.map((i) => ({
          ingredient_id: i.ingredient_id,
          employee_id: CURRENT_EMPLOYEE_ID,
          quantity_change: i.quantity_received,
          reason: "delivery",
          moved_at,
        })),
      );
    });
  };

  const store: ManagerStore = {
    db,
    update,
    placeOrder,
    completeOrder,
    cancelOrder,
    recordMovement,
    recordDelivery,
  };

  return <ManagerDataContext.Provider value={store}>{children}</ManagerDataContext.Provider>;
}
