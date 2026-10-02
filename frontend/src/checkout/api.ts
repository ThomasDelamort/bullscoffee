import { useQuery } from "@tanstack/react-query";
import { useApi } from "../lib/apiContext";
import type { OrderSource, OrderStatus } from "../POS/types";

/** The Checkout Session API's names for the methods the store takes. */
export type PaymongoMethod = "gcash" | "paymaya" | "grab_pay" | "qrph" | "card";

export const PAYMONGO_METHOD_LABELS: Record<PaymongoMethod, string> = {
  gcash: "GCash",
  paymaya: "Maya",
  grab_pay: "GrabPay",
  qrph: "QR Ph",
  card: "Card",
};

/** "GCash, Maya or Card" */
export function describeMethods(methods: PaymongoMethod[]): string {
  const labels = methods.map((m) => PAYMONGO_METHOD_LABELS[m]);
  return labels.length > 1 ? `${labels.slice(0, -1).join(", ")} or ${labels.at(-1)}` : (labels[0] ?? "");
}

export const paymentKeys = {
  options: ["payments", "options"] as const,
  status: (orderId: number) => ["payments", "status", orderId] as const,
};

export interface PaymentOptions {
  /** PayMongo is set up and at least one method is switched on. */
  online: boolean;
  methods: PaymongoMethod[];
}

/** Whether to offer online payment. Public, so the kiosk can ask too. */
export function usePaymentOptions() {
  const api = useApi();
  return useQuery({
    queryKey: paymentKeys.options,
    queryFn: () => api.get<PaymentOptions>("/payments/options"),
    // The kiosk never refocuses, so pick up the admin switching methods.
    refetchInterval: 5 * 60_000,
  });
}

export interface OrderPaymentStatus {
  order_id: number;
  order_source: OrderSource;
  order_status: OrderStatus;
  paid: boolean;
}

/** How often the return page asks whether PayMongo's webhook has landed. */
const STATUS_POLL_MS = 3_000;

/** Polls until the order is paid when `poll` is set; answers once otherwise. */
export function useOrderPaymentStatus(orderId: number | null, poll: boolean) {
  const api = useApi();
  return useQuery({
    queryKey: paymentKeys.status(orderId ?? 0),
    queryFn: () => api.get<OrderPaymentStatus>(`/payments/orders/${orderId}/status`),
    enabled: orderId !== null,
    staleTime: 0,
    refetchInterval: (query) => (poll && !query.state.data?.paid ? STATUS_POLL_MS : false),
  });
}

/** Leaves the app for PayMongo's hosted checkout; it sends the customer back to /checkout/success or /cancel. */
export function goToCheckout(checkoutUrl: string): void {
  window.location.assign(checkoutUrl);
}
