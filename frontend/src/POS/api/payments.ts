import { useMutation } from "@tanstack/react-query";
import { useApi } from "../../lib/apiContext";

/**
 * Starts a PayMongo checkout for what's still owed on a pending order. The
 * order isn't paid until PayMongo's webhook says so; the order list picks
 * that up on its next refresh.
 */
export function useStartCheckout() {
  const api = useApi();
  return useMutation({
    mutationFn: (orderId: number) =>
      api.post<{ checkout_url: string }>("/payments/checkout-session", { order_id: orderId }),
  });
}
