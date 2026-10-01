import { keepPreviousData, useMutation, useQuery } from "@tanstack/react-query";
import { saveBlob } from "../../lib/api";
import { useApi } from "../../lib/apiContext";
import type { ReportPeriod, SalesReport } from "../types";
import { managerKeys } from "./keys";

/** `date` is any YYYY-MM-DD in the period; monthly reports cover its whole month. */
export function useSalesReport(period: ReportPeriod, date: string) {
  const api = useApi();
  return useQuery({
    queryKey: managerKeys.salesReport(period, date),
    queryFn: () => api.get<SalesReport>("/reports/sales", { period, date }),
    placeholderData: keepPreviousData,
  });
}

/** Downloads the backend's CSV: one row per completed order in the period. */
export function useExportSales() {
  const api = useApi();
  return useMutation({
    mutationFn: async ({ period, date }: { period: ReportPeriod; date: string }) => {
      const { blob, filename } = await api.download("/reports/sales/export", { period, date });
      // Cross-origin, Content-Disposition is hidden unless CORS exposes it, so mirror the backend's name.
      saveBlob(blob, filename ?? `sales-${period}-${period === "monthly" ? date.slice(0, 7) : date}.csv`);
    },
  });
}
