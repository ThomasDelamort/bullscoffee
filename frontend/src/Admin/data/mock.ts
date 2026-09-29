/**
 * Placeholder data for the admin UI. Swap each export for an API call once
 * the matching backend route exists; the shapes live in ../types.ts.
 */
import type {
  AdminUser,
  Backup,
  Branch,
  ExportJob,
  LogEntry,
  NotificationTemplate,
  PaymentGatewaySettings,
  Permission,
  PermissionMatrix,
  Role,
  SeriesPoint,
  ServiceStatus,
  Ticket,
} from "../types";

export const ROLES: readonly Role[] = ["admin", "manager", "cashier", "supplier", "customer"];

export const ROLE_LABELS: Record<Role, string> = {
  admin: "Admin",
  manager: "Manager",
  cashier: "Cashier / Barista",
  supplier: "Supplier",
  customer: "Customer",
};

export const BRANCH_NAMES = ["Main Campus", "Engineering Hall", "Downtown Kiosk"] as const;

export const USERS: AdminUser[] = [
  { id: 1, first_name: "Chris", last_name: "Paredes", email: "chris.paredes@bullscoffee.ph", role: "admin", status: "active", branch: null, last_active: "2026-09-29T09:12:00+08:00" },
  { id: 2, first_name: "Andrea", last_name: "Villanueva", email: "andrea.v@bullscoffee.ph", role: "manager", status: "active", branch: "Main Campus", last_active: "2026-09-29T08:47:00+08:00" },
  { id: 3, first_name: "Marco", last_name: "Dela Cruz", email: "marco.dc@bullscoffee.ph", role: "manager", status: "active", branch: "Engineering Hall", last_active: "2026-09-28T18:05:00+08:00" },
  { id: 4, first_name: "Jessa", last_name: "Ramos", email: "jessa.ramos@bullscoffee.ph", role: "cashier", status: "active", branch: "Main Campus", last_active: "2026-09-29T09:02:00+08:00" },
  { id: 5, first_name: "Paolo", last_name: "Santos", email: "paolo.santos@bullscoffee.ph", role: "cashier", status: "locked", branch: "Main Campus", last_active: "2026-09-29T07:31:00+08:00" },
  { id: 6, first_name: "Bea", last_name: "Mendoza", email: "bea.mendoza@bullscoffee.ph", role: "cashier", status: "active", branch: "Engineering Hall", last_active: "2026-09-28T16:22:00+08:00" },
  { id: 7, first_name: "Kevin", last_name: "Lim", email: "kevin.lim@bullscoffee.ph", role: "cashier", status: "deactivated", branch: "Downtown Kiosk", last_active: "2026-08-14T12:00:00+08:00" },
  { id: 8, first_name: "Rosa", last_name: "Aquino", email: "orders@highlandbeans.ph", role: "supplier", status: "active", branch: null, last_active: "2026-09-27T10:40:00+08:00" },
  { id: 9, first_name: "Dennis", last_name: "Tan", email: "dennis@dairyfresh.ph", role: "supplier", status: "active", branch: null, last_active: "2026-09-25T14:10:00+08:00" },
  { id: 10, first_name: "Mika", last_name: "Reyes", email: "mika.reyes@student.edu.ph", role: "customer", status: "active", branch: null, last_active: "2026-09-29T08:15:00+08:00" },
  { id: 11, first_name: "Joshua", last_name: "Garcia", email: "joshua.garcia@student.edu.ph", role: "customer", status: "active", branch: null, last_active: "2026-09-28T20:44:00+08:00" },
  { id: 12, first_name: "Trisha", last_name: "Bautista", email: "trisha.b@student.edu.ph", role: "customer", status: "locked", branch: null, last_active: "2026-09-26T11:09:00+08:00" },
];

export const PERMISSIONS: Permission[] = [
  { id: "orders.view", label: "View orders", module: "Orders" },
  { id: "orders.process", label: "Process walk-in & online orders", module: "Orders" },
  { id: "orders.void", label: "Void or cancel orders", module: "Orders" },
  { id: "orders.refund", label: "Process refunds", module: "Orders" },
  { id: "menu.manage", label: "Manage menu items", module: "Menu & pricing" },
  { id: "menu.pricing", label: "Manage pricing & recipes", module: "Menu & pricing" },
  { id: "menu.promotions", label: "Manage promotions & loyalty", module: "Menu & pricing" },
  { id: "inventory.view", label: "View inventory", module: "Inventory" },
  { id: "inventory.manage", label: "Adjust stock & log wastage", module: "Inventory" },
  { id: "inventory.purchase", label: "Create purchase orders", module: "Inventory" },
  { id: "supply.fulfil", label: "Confirm & deliver purchase orders", module: "Inventory" },
  { id: "staff.schedule", label: "Manage staff schedules", module: "Staff" },
  { id: "staff.attendance", label: "View attendance", module: "Staff" },
  { id: "reports.view", label: "View sales reports", module: "Reports" },
  { id: "reports.export", label: "Export reports", module: "Reports" },
  { id: "system.users", label: "Manage users & roles", module: "System" },
  { id: "system.logs", label: "View system logs", module: "System" },
  { id: "system.settings", label: "Configure system settings", module: "System" },
  { id: "system.payments", label: "Manage payment gateway", module: "System" },
  { id: "system.backups", label: "Backup & restore database", module: "System" },
];

export const DEFAULT_PERMISSIONS: PermissionMatrix = {
  admin: PERMISSIONS.map((p) => p.id),
  manager: [
    "orders.view", "orders.process", "orders.void", "orders.refund",
    "menu.manage", "menu.pricing", "menu.promotions",
    "inventory.view", "inventory.manage", "inventory.purchase",
    "staff.schedule", "staff.attendance", "reports.view", "reports.export", "system.logs",
  ],
  cashier: ["orders.view", "orders.process", "orders.void", "inventory.view", "inventory.manage"],
  supplier: ["supply.fulfil"],
  customer: [],
};

export const LOGS: LogEntry[] = [
  { id: 1, timestamp: "2026-09-29T09:14:22+08:00", actor: "Chris Paredes", role: "admin", action: "Updated role for Bea Mendoza (cashier)", module: "Users", ip: "10.0.4.12", severity: "info" },
  { id: 2, timestamp: "2026-09-29T09:02:10+08:00", actor: "Jessa Ramos", role: "cashier", action: "Opened shift & cash drawer", module: "POS", ip: "10.0.2.31", severity: "info" },
  { id: 3, timestamp: "2026-09-29T07:31:48+08:00", actor: "Paolo Santos", role: "cashier", action: "Account locked after 5 failed sign-in attempts", module: "Auth", ip: "112.198.74.20", severity: "critical", flag: { reason: "Repeated failed sign-ins from an unrecognized IP", reviewed: false } },
  { id: 4, timestamp: "2026-09-29T03:00:04+08:00", actor: "System", role: "system", action: "Automatic database backup completed (1.84 GB)", module: "Backups", ip: "—", severity: "info" },
  { id: 5, timestamp: "2026-09-28T22:47:15+08:00", actor: "Marco Dela Cruz", role: "manager", action: "Exported 12,480 customer records to CSV", module: "Reports", ip: "180.190.33.7", severity: "warning", flag: { reason: "Bulk data export outside business hours", reviewed: false } },
  { id: 6, timestamp: "2026-09-28T18:05:31+08:00", actor: "Marco Dela Cruz", role: "manager", action: "Approved refund #R-2291 (₱4,850.00)", module: "Orders", ip: "10.0.3.8", severity: "warning", flag: { reason: "Refund above ₱3,000 threshold", reviewed: true } },
  { id: 7, timestamp: "2026-09-28T16:22:09+08:00", actor: "Bea Mendoza", role: "cashier", action: "Voided order #O-18842", module: "Orders", ip: "10.0.3.14", severity: "info" },
  { id: 8, timestamp: "2026-09-28T14:10:44+08:00", actor: "System", role: "system", action: "Payment webhook retries exceeded for GCash (3 events)", module: "Payments", ip: "—", severity: "warning" },
  { id: 9, timestamp: "2026-09-28T11:36:02+08:00", actor: "Andrea Villanueva", role: "manager", action: "Updated price of Caramel Macchiato (₱165 → ₱175)", module: "Menu", ip: "10.0.4.3", severity: "info" },
  { id: 10, timestamp: "2026-09-28T02:18:57+08:00", actor: "Unknown", role: "system", action: "Sign-in attempt as admin with invalid 2FA code", module: "Auth", ip: "45.83.12.201", severity: "critical", flag: { reason: "Admin sign-in attempt from a foreign IP", reviewed: false } },
  { id: 11, timestamp: "2026-09-27T10:40:12+08:00", actor: "Rosa Aquino", role: "supplier", action: "Confirmed purchase order #PO-0412", module: "Inventory", ip: "121.54.9.66", severity: "info" },
  { id: 12, timestamp: "2026-09-26T11:09:30+08:00", actor: "Trisha Bautista", role: "customer", action: "Account locked after 5 failed sign-in attempts", module: "Auth", ip: "49.145.22.8", severity: "warning" },
  { id: 13, timestamp: "2026-09-26T09:00:00+08:00", actor: "Chris Paredes", role: "admin", action: "Changed session timeout (60 → 30 min)", module: "Settings", ip: "10.0.4.12", severity: "info" },
  { id: 14, timestamp: "2026-09-25T15:27:41+08:00", actor: "Jessa Ramos", role: "cashier", action: "Applied 100% discount to order #O-18110", module: "Orders", ip: "10.0.2.31", severity: "warning", flag: { reason: "Full-value discount applied by cashier", reviewed: false } },
];

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

export const SIGN_INS_7D: SeriesPoint[] = [
  { label: "Tue", value: 412 },
  { label: "Wed", value: 468 },
  { label: "Thu", value: 455 },
  { label: "Fri", value: 521 },
  { label: "Sat", value: 238 },
  { label: "Sun", value: 176 },
  { label: "Mon", value: 489 },
];

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

export const PAYMONGO_SETTINGS: PaymentGatewaySettings = {
  mode: "live",
  public_key: "pk_live_••••••••••••sLp",
  secret_key: "sk_live_••••••••••••••••••••••••c19e7",
  webhook_url: "https://api.bullscoffee.ph/webhooks/paymongo",
  methods: [
    { id: "gcash", label: "GCash", enabled: true },
    { id: "maya", label: "Maya", enabled: true },
    { id: "grab_pay", label: "GrabPay", enabled: true },
    { id: "card", label: "Credit & debit cards", enabled: false },
    { id: "qrph", label: "QR Ph", enabled: true },
  ],
};

export const BRANCHES: Branch[] = [
  { id: 1, name: "Main Campus", address: "Ground floor, Student Center, University Ave.", manager: "Andrea Villanueva", phone: "+63 917 555 0101", hours: "7:00 AM – 9:00 PM", staff_count: 9, status: "open" },
  { id: 2, name: "Engineering Hall", address: "2F Lobby, Engineering Hall, Science Rd.", manager: "Marco Dela Cruz", phone: "+63 917 555 0102", hours: "7:30 AM – 7:00 PM", staff_count: 5, status: "open" },
  { id: 3, name: "Downtown Kiosk", address: "Stall 14, Rizal Street Market", manager: "Unassigned", phone: "+63 917 555 0103", hours: "8:00 AM – 6:00 PM", staff_count: 0, status: "inactive" },
];

export const TEMPLATE_VARIABLES = [
  "customer_name", "order_id", "order_total", "branch_name", "pickup_time", "points_balance", "reset_link",
] as const;

export const TEMPLATE_SAMPLE: Record<(typeof TEMPLATE_VARIABLES)[number], string> = {
  customer_name: "Mika",
  order_id: "O-18901",
  order_total: "₱355.00",
  branch_name: "Main Campus",
  pickup_time: "9:40 AM",
  points_balance: "320",
  reset_link: "https://bullscoffee.ph/reset/•••",
};

export const TEMPLATES: NotificationTemplate[] = [
  { id: "order-confirmed", name: "Order confirmed", event: "order.placed", channel: "email", enabled: true, subject: "We got your order, {{customer_name}}!", body: "Hi {{customer_name}},\n\nThanks for ordering at Bull's Coffee {{branch_name}}. Your order {{order_id}} ({{order_total}}) is being prepared and will be ready for pickup around {{pickup_time}}.\n\nSee you soon!" },
  { id: "order-ready", name: "Order ready for pickup", event: "order.ready", channel: "sms", enabled: true, subject: "", body: "Bull's Coffee: Order {{order_id}} is ready for pickup at {{branch_name}}. Enjoy!" },
  { id: "order-ready-push", name: "Order ready (push)", event: "order.ready", channel: "push", enabled: true, subject: "Your coffee is ready ☕", body: "Order {{order_id}} is waiting for you at {{branch_name}}." },
  { id: "payment-receipt", name: "Payment receipt", event: "payment.confirmed", channel: "email", enabled: true, subject: "Receipt for order {{order_id}}", body: "Hi {{customer_name}},\n\nWe received your payment of {{order_total}} for order {{order_id}}. Your receipt is attached.\n\nYou now have {{points_balance}} loyalty points." },
  { id: "password-reset", name: "Password reset", event: "auth.password_reset", channel: "email", enabled: true, subject: "Reset your Bull's Coffee password", body: "Hi {{customer_name}},\n\nUse the link below to reset your password. It expires in 30 minutes.\n\n{{reset_link}}\n\nIf you didn't ask for this, you can ignore this email." },
  { id: "refund-issued", name: "Refund issued", event: "order.refunded", channel: "email", enabled: false, subject: "Your refund for {{order_id}}", body: "Hi {{customer_name}},\n\nWe've refunded {{order_total}} for order {{order_id}}. It may take 3–5 banking days to appear." },
];

export const EXPORT_DATASETS = [
  "Orders", "Transactions", "Customers", "Employees", "Inventory", "System logs",
] as const;

export const EXPORT_JOBS: ExportJob[] = [
  { id: "ex-311", dataset: "Transactions", format: "xlsx", range: "Sep 1 – Sep 28, 2026", requested_at: "2026-09-28T17:20:00+08:00", status: "ready", size: "3.2 MB" },
  { id: "ex-310", dataset: "Customers", format: "csv", range: "All time", requested_at: "2026-09-28T22:47:00+08:00", status: "ready", size: "1.1 MB" },
  { id: "ex-309", dataset: "System logs", format: "json", range: "Aug 2026", requested_at: "2026-09-02T09:05:00+08:00", status: "failed", size: null },
];
