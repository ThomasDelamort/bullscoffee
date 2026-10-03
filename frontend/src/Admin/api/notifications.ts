import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useApi } from "../../lib/apiContext";
import type {
  NotificationLogEntry,
  NotificationTemplate,
  SendResult,
  TemplateChanges,
  TemplatesResponse,
} from "../types";
import { adminKeys } from "./keys";

export function useNotificationTemplates() {
  const api = useApi();
  return useQuery({
    queryKey: adminKeys.notifications,
    queryFn: () => api.get<TemplatesResponse>("/admin/notifications/templates"),
  });
}

export function useSaveTemplate() {
  const api = useApi();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, changes }: { id: string; changes: TemplateChanges }) =>
      api.put<NotificationTemplate>(`/admin/notifications/templates/${encodeURIComponent(id)}`, changes),
    onSuccess: (saved) => {
      queryClient.setQueryData<TemplatesResponse>(adminKeys.notifications, (current) =>
        current && { ...current, templates: current.templates.map((t) => (t.id === saved.id ? saved : t)) },
      );
      void queryClient.invalidateQueries({ queryKey: adminKeys.activity });
    },
  });
}

/** Sends the saved template, with sample values, to the signed-in admin. */
export function useSendTestTemplate() {
  const api = useApi();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api.post<SendResult>(`/admin/notifications/templates/${encodeURIComponent(id)}/test`),
    onSettled: () => queryClient.invalidateQueries({ queryKey: adminKeys.notificationLog }),
  });
}

/** The latest send attempts: sent, failed, or skipped and why. */
export function useNotificationLog(limit = 20) {
  const api = useApi();
  return useQuery({
    queryKey: [...adminKeys.notificationLog, limit],
    queryFn: () => api.get<NotificationLogEntry[]>("/admin/notifications/log", { limit }),
  });
}
