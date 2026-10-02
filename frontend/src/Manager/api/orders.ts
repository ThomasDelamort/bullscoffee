import { keepPreviousData, useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { useApi } from "../../lib/apiContext";
import type { ItemSize, Order, OrderDetails, OrderStatus, PaymentMethod } from "../types";
import { numeric } from "./forms";
import { managerKeys, type OrderFilters } from "./keys";

const toOrder = (o: Order): Order => numeric(o, "discount_amount", "total_amount", "balance_due");
const toOrderDetails = (o: OrderDetails): OrderDetails => ({
  ...toOrder(o),
  items: o.items.map((i) => numeric(i, "selling_price", "quantity")),
  payments: o.payments.map((p) => numeric(p, "amount_paid")),
});

/** How often a live view (the pending queue) re-checks for new orders. */
const LIVE_REFETCH_MS = 15_000;

interface OrdersOptions {
  /** Poll for new orders, e.g. for the pending queue. */
  live?: boolean;
  enabled?: boolean;
}

export function useOrders(filters: OrderFilters, { live = false, enabled = true }: OrdersOptions = {}) {
  const api = useApi();
  return useQuery({
    queryKey: managerKeys.orderList(filters),
    queryFn: async () => (await api.get<Order[]>("/orders", { ...filters })).map(toOrder),
    // Changing a filter keeps the old rows on screen until the new ones land.
    placeholderData: keepPreviousData,
    refetchInterval: live ? LIVE_REFETCH_MS : false,
    enabled,
  });
}

export function useOrder(orderId: number | null) {
  const api = useApi();
  return useQuery({
    queryKey: managerKeys.order(orderId ?? 0),
    queryFn: async () => toOrderDetails(await api.get<OrderDetails>(`/orders/${orderId}`)),
    enabled: orderId !== null,
  });
}

export interface NewOrderInput {
  customer_id: number | null;
  discount_amount: number;
  items: {
    product_id: number;
    quantity: number;
    size: ItemSize | null;
    /** Per unit, size upcharge included. */
    selling_price: number;
    special_instructions: string | null;
  }[];
  /** Omit for a fully discounted order: the backend requires amount_paid > 0. */
  payment?: { amount_paid: number; payment_method: PaymentMethod };
  order_status: OrderStatus;
}

export function usePlaceOrder() {
  const api = useApi();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (order: NewOrderInput) => toOrderDetails(await api.post<OrderDetails>("/orders", order)),
    onSuccess: (order) => {
      queryClient.setQueryData(managerKeys.order(order.order_id), order);
      return Promise.all([
        queryClient.invalidateQueries({ queryKey: managerKeys.orderLists }),
        queryClient.invalidateQueries({ queryKey: managerKeys.reports }),
      ]);
    },
  });
}

/**
 * Takes payment at the counter for a kiosk order. The backend charges the
 * whole balance, so only the method is sent. The order stays pending, now in
 * the barista's queue.
 */
export function usePayOrder() {
  const api = useApi();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ orderId, method }: { orderId: number; method: PaymentMethod }) =>
      toOrderDetails(await api.post<OrderDetails>(`/orders/${orderId}/payments`, { payment_method: method })),
    onSuccess: (order) => {
      queryClient.setQueryData(managerKeys.order(order.order_id), order);
      return Promise.all([
        queryClient.invalidateQueries({ queryKey: managerKeys.orderLists }),
        queryClient.invalidateQueries({ queryKey: managerKeys.reports }),
      ]);
    },
  });
}

/** Moves a pending order on. Every cached list shows the new status at once and rolls back on failure. */
function useOrderTransition(action: "complete" | "cancel", status: Exclude<OrderStatus, "pending">) {
  const api = useApi();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (orderId: number) =>
      toOrderDetails(await api.patch<OrderDetails>(`/orders/${orderId}/${action}`)),
    onMutate: async (orderId) => {
      await queryClient.cancelQueries({ queryKey: managerKeys.orders });
      const snapshot = queryClient.getQueriesData<Order[]>({ queryKey: managerKeys.orderLists });
      setStatusInLists(queryClient, orderId, status);
      return { snapshot };
    },
    onError: (_error, _orderId, context) => {
      for (const [key, rows] of context?.snapshot ?? []) queryClient.setQueryData(key, rows);
    },
    onSuccess: (order) => queryClient.setQueryData(managerKeys.order(order.order_id), order),
    onSettled: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: managerKeys.orderLists }),
        queryClient.invalidateQueries({ queryKey: managerKeys.reports }),
      ]),
  });
}

function setStatusInLists(queryClient: QueryClient, orderId: number, order_status: OrderStatus) {
  queryClient.setQueriesData<Order[]>({ queryKey: managerKeys.orderLists }, (rows) =>
    rows?.map((o) => (o.order_id === orderId ? { ...o, order_status } : o)),
  );
}

export const useCompleteOrder = () => useOrderTransition("complete", "completed");
export const useCancelOrder = () => useOrderTransition("cancel", "cancelled");
