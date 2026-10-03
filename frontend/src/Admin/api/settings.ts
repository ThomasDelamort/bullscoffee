import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useApi } from "../../lib/apiContext";
import { publicSettingsKey } from "../../lib/publicSettings";
import type { GeneralSettings, SystemSettings } from "../types";
import { adminKeys } from "./keys";

export function useSettings() {
  const api = useApi();
  return useQuery({
    queryKey: adminKeys.settings,
    queryFn: () => api.get<SystemSettings>("/admin/settings"),
  });
}

export function useSaveSettings() {
  const api = useApi();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (changes: Partial<GeneralSettings>) => api.put<SystemSettings>("/admin/settings", changes),
    onSuccess: (settings) => {
      queryClient.setQueryData(adminKeys.settings, settings);
      // The storefront banner and the kiosk read the public copy.
      void queryClient.invalidateQueries({ queryKey: publicSettingsKey });
      void queryClient.invalidateQueries({ queryKey: adminKeys.activity });
    },
  });
}
