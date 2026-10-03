import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { saveBlob } from "../../lib/api";
import { useApi } from "../../lib/apiContext";
import type { Backup, BackupSchedule, BackupsResponse } from "../types";
import { adminKeys } from "./keys";

/** Polls every 2 seconds while a backup is running, so it flips to done on its own. */
export function useBackups() {
  const api = useApi();
  return useQuery({
    queryKey: adminKeys.backups,
    queryFn: () => api.get<BackupsResponse>("/admin/backups"),
    refetchInterval: (query) =>
      query.state.data?.backups.some((b) => b.status === "in_progress") ? 2_000 : false,
  });
}

function useInvalidateBackups() {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: adminKeys.backups }),
      queryClient.invalidateQueries({ queryKey: adminKeys.activity }),
    ]);
}

export function useSaveBackupSchedule() {
  const api = useApi();
  const invalidate = useInvalidateBackups();
  return useMutation({
    mutationFn: (schedule: BackupSchedule) => api.put("/admin/backups/schedule", schedule),
    onSuccess: invalidate,
  });
}

export function useCreateBackup() {
  const api = useApi();
  const invalidate = useInvalidateBackups();
  return useMutation({
    mutationFn: () => api.post<Backup>("/admin/backups"),
    onSuccess: invalidate,
  });
}

export function useDeleteBackup() {
  const api = useApi();
  const invalidate = useInvalidateBackups();
  return useMutation({
    mutationFn: (backupId: number) => api.delete(`/admin/backups/${backupId}`),
    onSuccess: invalidate,
  });
}

/**
 * Replaces the database with the backup. Every cached query is stale after
 * that, so all of them refresh, not just the admin ones.
 */
export function useRestoreBackup() {
  const api = useApi();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (backupId: number) =>
      api.post<{ restored: Record<string, number> }>(`/admin/backups/${backupId}/restore`, { confirm: "RESTORE" }),
    onSuccess: () => queryClient.invalidateQueries(),
  });
}

export function useDownloadBackup() {
  const api = useApi();
  return useMutation({
    mutationFn: async (backup: Backup) => {
      const { blob, filename } = await api.download(`/admin/backups/${backup.id}/download`);
      saveBlob(blob, filename ?? `bullscoffee-backup-${backup.created_at.slice(0, 10)}.json.gz`);
    },
  });
}
