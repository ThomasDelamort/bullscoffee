/**
 * Placeholder data for the admin UI. Swap each export for an API call once
 * the matching backend route exists; the shapes live in ../types.ts.
 */
import type {
  ExportJob,
} from "../types";

export const EXPORT_DATASETS = [
  "Orders", "Transactions", "Customers", "Employees", "Inventory", "System logs",
] as const;

export const EXPORT_JOBS: ExportJob[] = [
  { id: "ex-311", dataset: "Transactions", format: "xlsx", range: "Sep 1 – Sep 28, 2026", requested_at: "2026-09-28T17:20:00+08:00", status: "ready", size: "3.2 MB" },
  { id: "ex-310", dataset: "Customers", format: "csv", range: "All time", requested_at: "2026-09-28T22:47:00+08:00", status: "ready", size: "1.1 MB" },
  { id: "ex-309", dataset: "System logs", format: "json", range: "Aug 2026", requested_at: "2026-09-02T09:05:00+08:00", status: "failed", size: null },
];
