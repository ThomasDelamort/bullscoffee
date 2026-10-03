/**
 * Placeholder data for the admin UI. Swap each export for an API call once
 * the matching backend route exists; the shapes live in ../types.ts.
 */
import type {
  Backup,
  ExportJob,
  SeriesPoint,
  ServiceStatus,
  Ticket,
} from "../types";

export const TICKETS: Ticket[] = [
  {
    id: "T-1042", kind: "bug", subject: "Payment stuck on 'processing' with GCash", reporter: "Mika Reyes", reporter_email: "mika.reyes@student.edu.ph",
    priority: "urgent", status: "open", created_at: "2026-09-29T08:20:00+08:00",
    description: "I paid for my order using GCash and the money was deducted, but the app has shown 'Processing payment' for 20 minutes. Order #O-18901.",
    replies: [],
  },
  {
    id: "T-1041", kind: "complaint", subject: "Charged twice for the same order", reporter: "Joshua Garcia", reporter_email: "joshua.garcia@student.edu.ph",
    priority: "high", status: "in-progress", created_at: "2026-09-28T19:02:00+08:00",
    description: "My card was charged ₱185 twice for one Spanish Latte. Please refund the duplicate charge.",
    replies: [
      { author: "Chris Paredes", from: "staff", body: "Hi Joshua, thanks for flagging this. We can see two authorizations and are confirming with the payment provider. We'll update you within 24 hours.", at: "2026-09-28T20:15:00+08:00" },
    ],
  },
  {
    id: "T-1040", kind: "bug", subject: "Order history page is blank on iPhone", reporter: "Trisha Bautista", reporter_email: "trisha.b@student.edu.ph",
    priority: "medium", status: "open", created_at: "2026-09-28T12:44:00+08:00",
    description: "When I open Order History on Safari (iOS 19) the page loads but nothing shows. It works on my laptop.",
    replies: [],
  },
  {
    id: "T-1039", kind: "complaint", subject: "Loyalty points not credited", reporter: "Mika Reyes", reporter_email: "mika.reyes@student.edu.ph",
    priority: "low", status: "resolved", created_at: "2026-09-26T09:30:00+08:00",
    description: "I bought 3 drinks yesterday but my points balance didn't change.",
    replies: [
      { author: "Chris Paredes", from: "staff", body: "Points were delayed by a sync job. We've credited 45 points to your account.", at: "2026-09-26T13:10:00+08:00" },
      { author: "Mika Reyes", from: "reporter", body: "Got them, thank you!", at: "2026-09-26T13:42:00+08:00" },
    ],
  },
  {
    id: "T-1038", kind: "bug", subject: "Receipt PDF shows wrong branch address", reporter: "Andrea Villanueva", reporter_email: "andrea.v@bullscoffee.ph",
    priority: "medium", status: "in-progress", created_at: "2026-09-25T15:05:00+08:00",
    description: "Receipts printed at Engineering Hall still show the Main Campus address in the header.",
    replies: [],
  },
  {
    id: "T-1037", kind: "complaint", subject: "Promo code SEMSTART rejected", reporter: "Joshua Garcia", reporter_email: "joshua.garcia@student.edu.ph",
    priority: "low", status: "closed", created_at: "2026-09-22T10:12:00+08:00",
    description: "The code from the poster says invalid at checkout.",
    replies: [
      { author: "Chris Paredes", from: "staff", body: "SEMSTART expired on Sept 20. We've added a one-time 10% voucher to your account instead.", at: "2026-09-22T11:00:00+08:00" },
    ],
  },
];

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
