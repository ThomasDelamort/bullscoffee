import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useApi } from "../../lib/apiContext";
import type { PermissionMatrix, PermissionsResponse } from "../types";
import { adminKeys } from "./keys";

/** The permission catalogue and what managers and cashiers hold. */
export function usePermissions() {
  const api = useApi();
  return useQuery({
    queryKey: adminKeys.permissions,
    queryFn: () => api.get<PermissionsResponse>("/admin/permissions"),
  });
}

/** Saves the whole matrix; the API checks it on the very next request. */
export function useSavePermissions() {
  const api = useApi();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (matrix: PermissionMatrix) => api.put<PermissionsResponse>("/admin/permissions", { matrix }),
    onSuccess: (saved) => {
      queryClient.setQueryData(adminKeys.permissions, saved);
      void queryClient.invalidateQueries({ queryKey: adminKeys.activity });
    },
  });
}
