/** Status → badge tone + label, so every screen describes a state the same way. */
import type { StockState } from "../data/selectors";
import type {
  EmployeeStatus,
  FeedbackStatus,
  OrderStatus,
  PaymentMethod,
  StockMovementReason,
} from "../types";
import type { Tone } from "./Badge";

type StatusMap<K extends string> = Record<K, { tone: Tone; label: string }>;

export const EMPLOYEE_STATUS: StatusMap<EmployeeStatus> = {
  active: { tone: "success", label: "Active" },
  inactive: { tone: "neutral", label: "Inactive" },
};

export const ORDER_STATUS: StatusMap<OrderStatus> = {
  pending: { tone: "warning", label: "Pending" },
  completed: { tone: "success", label: "Completed" },
  cancelled: { tone: "neutral", label: "Cancelled" },
};

export const STOCK_STATE: StatusMap<StockState> = {
  in: { tone: "success", label: "In stock" },
  low: { tone: "warning", label: "Low stock" },
  out: { tone: "danger", label: "Out of stock" },
};

export const MOVEMENT_REASON: StatusMap<StockMovementReason> = {
  delivery: { tone: "success", label: "Delivery" },
  sale: { tone: "info", label: "Sale" },
  waste: { tone: "danger", label: "Waste" },
  adjustment: { tone: "neutral", label: "Adjustment" },
};

export const FEEDBACK_STATUS: StatusMap<FeedbackStatus> = {
  new: { tone: "accent", label: "New" },
  reviewed: { tone: "neutral", label: "Reviewed" },
};

export type AttendanceState = "on-time" | "late" | "on-shift" | "no-clock-out";

export const ATTENDANCE_STATE: StatusMap<AttendanceState> = {
  "on-time": { tone: "success", label: "On time" },
  late: { tone: "warning", label: "Late" },
  "on-shift": { tone: "info", label: "On shift" },
  "no-clock-out": { tone: "danger", label: "No clock-out" },
};

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: "Cash",
  card: "Card",
  e_wallet: "E-wallet",
};
