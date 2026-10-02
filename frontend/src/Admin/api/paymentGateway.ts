import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { paymentKeys, type PaymongoMethod } from "../../checkout/api";
import { useApi } from "../../lib/apiContext";
import { adminKeys } from "./keys";

/**
 * GET /payments/gateway. Says whether each PayMongo key is set in
 * backend/.env, never what it is; the mode follows the secret key.
 */
export interface GatewayStatus {
  mode: "test" | "live";
  secret_key_set: boolean;
  webhook_secret_set: boolean;
  return_urls_set: boolean;
  enabled_methods: PaymongoMethod[];
  send_email_receipt: boolean;
}

export type GatewaySettings = Pick<GatewayStatus, "enabled_methods" | "send_email_receipt">;

export interface GatewayTest {
  mode: GatewayStatus["mode"];
  /** The PayMongo webhooks subscribed to checkout_session.payment.paid. */
  webhooks: { url: string; status: string }[];
}

export function useGateway() {
  const api = useApi();
  return useQuery({
    queryKey: adminKeys.gateway,
    queryFn: () => api.get<GatewayStatus>("/payments/gateway"),
  });
}

export function useSaveGateway() {
  const api = useApi();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (settings: GatewaySettings) => api.put<GatewayStatus>("/payments/gateway", settings),
    onSuccess: (status) => {
      queryClient.setQueryData(adminKeys.gateway, status);
      // What the kiosk and register offer follows these settings.
      void queryClient.invalidateQueries({ queryKey: paymentKeys.options });
    },
  });
}

export function useTestGateway() {
  const api = useApi();
  return useMutation({
    mutationFn: () => api.post<GatewayTest>("/payments/gateway/test"),
  });
}
