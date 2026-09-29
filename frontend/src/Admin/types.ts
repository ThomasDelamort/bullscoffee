/**
 * Shapes the admin screens render. They mirror what the backend will return,
 * but for now everything is fed from ./data/mock.ts.
 */

export type Role = "admin" | "manager" | "cashier" | "supplier" | "customer";
export type AccountStatus = "active" | "deactivated" | "locked";

export interface AdminUser {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  role: Role;
  status: AccountStatus;
  branch: string | null;
  last_active: string;
}

export interface Permission {
  id: string;
  label: string;
  module: string;
}

export type PermissionMatrix = Record<Role, string[]>;

export type Severity = "info" | "warning" | "critical";

export interface LogEntry {
  id: number;
  timestamp: string;
  actor: string;
  role: Role | "system";
  action: string;
  module: string;
  ip: string;
  severity: Severity;
  /** Set when the audit trail flags the event as suspicious. */
  flag?: { reason: string; reviewed: boolean };
}

export type TicketKind = "complaint" | "bug";
export type TicketStatus = "open" | "in-progress" | "resolved" | "closed";
export type TicketPriority = "low" | "medium" | "high" | "urgent";

export interface TicketReply {
  author: string;
  from: "staff" | "reporter";
  body: string;
  at: string;
}

export interface Ticket {
  id: string;
  kind: TicketKind;
  subject: string;
  reporter: string;
  reporter_email: string;
  priority: TicketPriority;
  status: TicketStatus;
  created_at: string;
  description: string;
  replies: TicketReply[];
}

export type ServiceState = "operational" | "degraded" | "down" | "restarting";

export interface ServiceStatus {
  id: string;
  name: string;
  description: string;
  state: ServiceState;
  latency_ms: number;
  uptime: number;
}

export interface Backup {
  id: string;
  created_at: string;
  size: string;
  kind: "automatic" | "manual";
  status: "completed" | "failed" | "in-progress";
}

export type GatewayMode = "sandbox" | "live";

export interface PaymentMethod {
  id: string;
  label: string;
  enabled: boolean;
}

export interface PaymentGatewaySettings {
  mode: GatewayMode;
  public_key: string;
  secret_key: string;
  webhook_url: string;
  methods: PaymentMethod[];
}

export type BranchStatus = "open" | "closed" | "inactive";

export interface Branch {
  id: number;
  name: string;
  address: string;
  manager: string;
  phone: string;
  hours: string;
  staff_count: number;
  status: BranchStatus;
}

export type NotificationChannel = "email" | "sms" | "push";

export interface NotificationTemplate {
  id: string;
  name: string;
  event: string;
  channel: NotificationChannel;
  subject: string;
  body: string;
  enabled: boolean;
}

export type ExportFormat = "csv" | "xlsx" | "json" | "pdf";

export interface ExportJob {
  id: string;
  dataset: string;
  format: ExportFormat;
  range: string;
  requested_at: string;
  status: "queued" | "ready" | "failed";
  size: string | null;
}

export interface SeriesPoint {
  label: string;
  value: number;
}
