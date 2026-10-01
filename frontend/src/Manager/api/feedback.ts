/**
 * The feedback table exists but its routes don't yet. These hooks follow the
 * planned contract in frontend/ManagerRoutes.md, so the screen lights up as
 * soon as GET /api/feedback and PATCH /api/feedback/:id land.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useApi } from "../../lib/apiContext";
import type { Feedback, FeedbackStatus } from "../types";
import { managerKeys } from "./keys";

export function useFeedback() {
  const api = useApi();
  return useQuery({
    queryKey: managerKeys.feedback,
    queryFn: () => api.get<Feedback[]>("/feedback"),
  });
}

/** Sets the status of one or many reviews, e.g. "mark shown as reviewed". */
export function useSetFeedbackStatus() {
  const api = useApi();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ ids, status }: { ids: number[]; status: FeedbackStatus }) =>
      Promise.all(ids.map((id) => api.patch<Feedback>(`/feedback/${id}`, { status }))),
    onMutate: async ({ ids, status }) => {
      await queryClient.cancelQueries({ queryKey: managerKeys.feedback });
      const previous = queryClient.getQueryData<Feedback[]>(managerKeys.feedback);
      const changed = new Set(ids);
      queryClient.setQueryData<Feedback[]>(managerKeys.feedback, (rows) =>
        rows?.map((f) => (changed.has(f.feedback_id) ? { ...f, status } : f)),
      );
      return { previous };
    },
    onError: (_error, _input, context) => {
      if (context?.previous) queryClient.setQueryData(managerKeys.feedback, context.previous);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: managerKeys.feedback }),
  });
}
