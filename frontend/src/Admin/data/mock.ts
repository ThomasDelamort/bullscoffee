/**
 * Placeholder data for the admin UI. Swap each export for an API call once
 * the matching backend route exists; the shapes live in ../types.ts.
 */
import type {
  Backup,
  ExportJob,
  SeriesPoint,
  ServiceStatus,
} from "../types";

export const SERVICES: ServiceStatus[] = [
  { id: "web", name: "Storefront", description: "Customer web app", state: "operational", latency_ms: 142, uptime: 99.98 },
  { id: "api", name: "API server", description: "Express backend", state: "operational", latency_ms: 88, uptime: 99.95 },
  { id: "db", name: "Database", description: "PostgreSQL primary", state: "operational", latency_ms: 12, uptime: 100 },
  { id: "auth", name: "Authentication", description: "Clerk sign-in", state: "operational", latency_ms: 210, uptime: 99.99 },
  { id: "payments", name: "Payment webhooks", description: "GCash, Maya, cards", state: "degraded", latency_ms: 1840, uptime: 98.72 },
  { id: "notify", name: "Notifications", description: "Email & SMS delivery", state: "operational", latency_ms: 320, uptime: 99.9 },
];

export const RESPONSE_TIME_24H: SeriesPoint[] = [
  118, 112, 104, 98, 96, 101, 124, 168, 212, 236, 228, 251,
  274, 262, 231, 219, 226, 244, 197, 172, 150, 139, 131, 142,
].map((value, i) => ({ label: `${String(i).padStart(2, "0")}:00`, value }));

export const RESOURCES = [
  { label: "CPU", value: 38, detail: "4 vCPU" },
  { label: "Memory", value: 64, detail: "5.1 of 8 GB" },
  { label: "Disk", value: 71, detail: "71 of 100 GB" },
  { label: "DB connections", value: 22, detail: "22 of 100" },
] as const;

export const BACKUPS: Backup[] = [
  { id: "bk-0929", created_at: "2026-09-29T03:00:04+08:00", size: "1.84 GB", kind: "automatic", status: "completed" },
  { id: "bk-0928", created_at: "2026-09-28T03:00:02+08:00", size: "1.83 GB", kind: "automatic", status: "completed" },
  { id: "bk-0927m", created_at: "2026-09-27T17:42:18+08:00", size: "1.83 GB", kind: "manual", status: "completed" },
  { id: "bk-0927", created_at: "2026-09-27T03:00:03+08:00", size: "—", kind: "automatic", status: "failed" },
  { id: "bk-0926", created_at: "2026-09-26T03:00:01+08:00", size: "1.81 GB", kind: "automatic", status: "completed" },
  { id: "bk-0925", created_at: "2026-09-25T03:00:05+08:00", size: "1.80 GB", kind: "automatic", status: "completed" },
];

export const EXPORT_DATASETS = [
  "Orders", "Transactions", "Customers", "Employees", "Inventory", "System logs",
] as const;

export const EXPORT_JOBS: ExportJob[] = [
  { id: "ex-311", dataset: "Transactions", format: "xlsx", range: "Sep 1 – Sep 28, 2026", requested_at: "2026-09-28T17:20:00+08:00", status: "ready", size: "3.2 MB" },
  { id: "ex-310", dataset: "Customers", format: "csv", range: "All time", requested_at: "2026-09-28T22:47:00+08:00", status: "ready", size: "1.1 MB" },
  { id: "ex-309", dataset: "System logs", format: "json", range: "Aug 2026", requested_at: "2026-09-02T09:05:00+08:00", status: "failed", size: null },
];
