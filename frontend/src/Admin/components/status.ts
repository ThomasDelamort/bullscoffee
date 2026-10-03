/** Status → badge tone + label, so every screen describes a state the same way. */
import type {
  AccountStatus,
  JobStatus,
  ServiceState,
  Severity,
  TicketPriority,
  TicketStatus,
} from "../types";
import type { Tone } from "./Badge";

type StatusMap<K extends string> = Record<K, { tone: Tone; label: string }>;

export const ACCOUNT_STATUS: StatusMap<AccountStatus> = {
  active: { tone: "success", label: "Active" },
  invited: { tone: "info", label: "Invited" },
  locked: { tone: "warning", label: "Locked" },
  deactivated: { tone: "neutral", label: "Deactivated" },
};

export const SEVERITY: StatusMap<Severity> = {
  info: { tone: "info", label: "Info" },
  warning: { tone: "warning", label: "Warning" },
  critical: { tone: "danger", label: "Critical" },
};

export const TICKET_STATUS: StatusMap<TicketStatus> = {
  open: { tone: "info", label: "Open" },
  in_progress: { tone: "gold", label: "In progress" },
  resolved: { tone: "success", label: "Resolved" },
  closed: { tone: "neutral", label: "Closed" },
};

export const TICKET_PRIORITY: StatusMap<TicketPriority> = {
  low: { tone: "neutral", label: "Low" },
  medium: { tone: "info", label: "Medium" },
  high: { tone: "warning", label: "High" },
  urgent: { tone: "danger", label: "Urgent" },
};

export const SERVICE_STATE: StatusMap<ServiceState> = {
  operational: { tone: "success", label: "Operational" },
  degraded: { tone: "warning", label: "Degraded" },
  down: { tone: "danger", label: "Down" },
  not_configured: { tone: "neutral", label: "Not set up" },
  unknown: { tone: "neutral", label: "Not checked yet" },
};

export const JOB_STATUS: StatusMap<JobStatus> = {
  completed: { tone: "success", label: "Completed" },
  failed: { tone: "danger", label: "Failed" },
  in_progress: { tone: "info", label: "In progress" },
};
