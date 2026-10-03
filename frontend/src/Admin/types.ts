/**
 * Shapes the admin screens render. They mirror what the backend will return,
 * but for now everything is fed from ./data/mock.ts.
 */

export type StaffRole = "admin" | "manager" | "cashier";
export type Role = StaffRole | "customer";

/** GET /manager/me: the signed-in user's employee row. */
export interface Employee {
  employee_id: number;
  clerk_id: string;
  first_name: string;
  last_name: string;
  employee_email: string;
  employee_role: StaffRole;
  employee_status: "active" | "inactive";
  work_schedule: string;
}
/** invited: added, but they haven't signed in with the invited address yet. */
export type AccountStatus = "active" | "invited" | "locked" | "deactivated";

/** GET /admin/users: an employee or a customer, with its Clerk account state. */
export interface AdminUser {
  clerk_id: string;
  kind: "employee" | "customer";
  /** employee_id or customer_id, by kind. */
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  role: Role;
  status: AccountStatus;
  /** From Clerk; null when they've never signed in. */
  last_active: string | null;
  /** Employees only. */
  work_schedule: string | null;
}

export interface NewStaff {
  first_name: string;
  last_name: string;
  email: string;
  role: StaffRole;
  work_schedule: string;
}

export type AccountAction = "lock" | "unlock" | "deactivate" | "reactivate" | "sign-out";

export interface Permission {
  id: string;
  label: string;
  module: string;
  /** What it gates, in words. */
  gates: string;
  /** System permissions: admins only, never grantable. */
  admin_only: boolean;
}

/** Roles whose permissions can be edited; admins hold every permission. */
export type EditableRole = "manager" | "cashier";
export type PermissionMatrix = Record<EditableRole, string[]>;

export interface PermissionsResponse {
  catalogue: Permission[];
  matrix: PermissionMatrix;
}

export type Severity = "info" | "warning" | "critical";

export interface ActivityFilters {
  view?: "all" | "audit";
  severity?: Severity;
  module?: string;
  search?: string;
}

export type ActorRole = StaffRole | "customer" | "system";

/** GET /admin/activity: one row of the activity log. */
export interface LogEntry {
  id: number;
  timestamp: string;
  actor: string;
  /** null for the System actor. */
  actor_clerk_id: string | null;
  role: ActorRole;
  action: string;
  module: string;
  ip: string | null;
  severity: Severity;
  /** Set when the audit trail flags the event as suspicious. */
  flag: { reason: string; reviewed_at: string | null; reviewed_by: string | null } | null;
}

export interface ActivityPage {
  entries: LogEntry[];
  /** Flagged entries nobody has reviewed yet, across the whole log. */
  unreviewed: number;
  has_more: boolean;
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

/** GET /admin/settings: the one row of store-wide settings. */
export interface SystemSettings {
  store_name: string;
  support_email: string;
  /** Kiosk self-ordering on or off. */
  online_ordering: boolean;
  maintenance_mode: boolean;
  maintenance_message: string;
  backup_enabled: boolean;
  backup_frequency: "hourly" | "daily" | "weekly";
  /** HH:MM, store time. */
  backup_time: string;
  backup_retention_days: 7 | 30 | 90 | 365;
  updated_at: string;
  updated_by_name: string | null;
}

/** What the Settings page edits; the backup schedule is saved from Backup & Restore. */
export type GeneralSettings = Pick<
  SystemSettings,
  "store_name" | "support_email" | "online_ordering" | "maintenance_mode" | "maintenance_message"
>;
