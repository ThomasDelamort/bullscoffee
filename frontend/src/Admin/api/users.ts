import { useQuery } from "@tanstack/react-query";
import { useApi } from "../../lib/apiContext";
import type { Employee } from "../types";
import { adminKeys } from "./keys";

/** The signed-in user's employee record; 403 when they aren't staff. */
export function useCurrentEmployee({ enabled = true }: { enabled?: boolean } = {}) {
  const api = useApi();
  return useQuery({
    queryKey: adminKeys.me,
    queryFn: () => api.get<Employee>("/manager/me"),
    staleTime: 5 * 60_000,
    enabled,
  });
}
