import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useApi } from "../../lib/apiContext";
import type { HealthReport, SeriesPoint } from "../types";
import { adminKeys } from "./keys";

/** Live: refreshed every 30 seconds while a screen shows it. */
export function useSystemHealth() {
  const api = useApi();
  return useQuery({
    queryKey: adminKeys.health,
    queryFn: () => api.get<HealthReport>("/admin/health"),
    refetchInterval: 30_000,
  });
}

/** Probes every service now (PayMongo included) and answers readable lines. */
export function useRunDiagnostics() {
  const api = useApi();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => (await api.post<{ lines: string[] }>("/admin/health/diagnostics")).lines,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: adminKeys.health }),
  });
}

const HOUR = new Intl.DateTimeFormat("en-PH", { hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone: "Asia/Manila" });

/** The 24-hour response-time chart's points, labelled in store time. An hour with no traffic plots as 0. */
export function responseSeries(report: HealthReport): SeriesPoint[] {
  return report.response_time_24h.map((h) => ({ label: HOUR.format(new Date(h.hour)), value: h.avg_ms ?? 0 }));
}

/** Average of the services' 30-day uptime, leaving out ones with no checks. */
export function averageUptime(report: HealthReport): number | null {
  const known = report.services.map((s) => s.uptime).filter((u): u is number => u !== null);
  return known.length ? known.reduce((sum, u) => sum + u, 0) / known.length : null;
}
