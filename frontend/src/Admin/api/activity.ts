import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useApi } from "../../lib/apiContext";
import type { ActivityFilters, ActivityPage, LogEntry } from "../types";
import { adminKeys } from "./keys";

/**
 * The activity log, newest first, filtered on the server. Pages are 200
 * entries; fetchNextPage loads the next 200 older ones.
 */
export function useActivity(filters: ActivityFilters, { limit = 200 }: { limit?: number } = {}) {
  const api = useApi();
  return useInfiniteQuery({
    queryKey: [...adminKeys.activityList(filters), limit],
    queryFn: ({ pageParam }) =>
      api.get<ActivityPage>("/admin/activity", { ...filters, limit, before: pageParam }),
    initialPageParam: undefined as number | undefined,
    getNextPageParam: (last) => (last.has_more ? last.entries.at(-1)?.id : undefined),
  });
}

export function useActivityModules() {
  const api = useApi();
  return useQuery({
    queryKey: adminKeys.activityModules,
    queryFn: () => api.get<string[]>("/admin/activity/modules"),
  });
}

export function useReviewActivity() {
  const api = useApi();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (logId: number) => api.patch<LogEntry>(`/admin/activity/${logId}/review`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: adminKeys.activity }),
  });
}

/** Sign-ins per day (Manila dates), oldest first. */
export function useSignIns(days: number) {
  const api = useApi();
  return useQuery({
    queryKey: adminKeys.signIns(days),
    queryFn: () => api.get<{ day: string; count: number }[]>("/admin/activity/stats/sign-ins", { days }),
  });
}
