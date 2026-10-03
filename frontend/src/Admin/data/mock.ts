/**
 * Placeholder data for the admin UI. Swap each export for an API call once
 * the matching backend route exists; the shapes live in ../types.ts.
 */
import type {
  Backup,
  ExportJob,
} from "../types";

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
