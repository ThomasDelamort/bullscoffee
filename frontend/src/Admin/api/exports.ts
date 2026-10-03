import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { saveBlob } from "../../lib/api";
import { useApi } from "../../lib/apiContext";
import type { ExportJob, ExportsResponse, NewExport } from "../types";
import { adminKeys } from "./keys";

/** Polls every 2 seconds while an export is being built. */
export function useExports() {
  const api = useApi();
  return useQuery({
    queryKey: adminKeys.exports,
    queryFn: () => api.get<ExportsResponse>("/admin/exports"),
    refetchInterval: (query) => (query.state.data?.jobs.some((j) => j.status === "in_progress") ? 2_000 : false),
  });
}

export function useCreateExport() {
  const api = useApi();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (request: NewExport) => api.post<ExportJob>("/admin/exports", request),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: adminKeys.exports }),
        queryClient.invalidateQueries({ queryKey: adminKeys.activity }),
      ]),
  });
}

export function useDownloadExport() {
  const api = useApi();
  return useMutation({
    mutationFn: async (job: ExportJob) => {
      const { blob, filename } = await api.download(`/admin/exports/${job.id}/download`);
      saveBlob(blob, filename ?? `bullscoffee-${job.dataset}.${job.format}`);
    },
  });
}
