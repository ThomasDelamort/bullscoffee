import { useQuery } from "@tanstack/react-query";
import { useApi } from "./apiContext";

/** GET /settings/public: store-wide settings anyone may read, set on the admin Settings page. */
export interface PublicSettings {
  store_name: string;
  support_email: string;
  /** false: the kiosk is closed to self-ordering. */
  online_ordering: boolean;
  /** true: the kiosk is closed and the storefront shows maintenance_message. */
  maintenance_mode: boolean;
  maintenance_message: string;
}

export const publicSettingsKey = ["public", "settings"] as const;

/**
 * The kiosk passes a refresh interval: it sits on one screen all day, so it
 * polls to notice maintenance starting or ending.
 */
export function usePublicSettings({ refetchInterval }: { refetchInterval?: number } = {}) {
  const api = useApi();
  return useQuery({
    queryKey: publicSettingsKey,
    queryFn: () => api.get<PublicSettings>("/settings/public"),
    staleTime: 60_000,
    ...(refetchInterval ? { refetchInterval } : {}),
  });
}

/** The support address from Settings, or `fallback` until it loads (or if it can't). */
export function useSupportEmail(fallback: string): string {
  return usePublicSettings().data?.support_email ?? fallback;
}
