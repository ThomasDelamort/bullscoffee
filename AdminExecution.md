# Admin console → backend: full wiring plan

## Context
Every Admin page except **Payment Gateway** still renders from `frontend/src/Admin/data/mock.ts`, so nothing an admin does is saved. The backend has only stubs: `/api/admin/customers` and `/api/admin/employees` CRUD, protected by `protectRoute` alone with no admin check. The Admin console has no access gate either, so anyone can open `/admin`.

This plan connects every page to real data, using the pattern Payment Gateway already follows:
- Backend: route → controller → provider, raw `pg`.
- Frontend: `Admin/api/*.ts` hooks with TanStack Query and `useApi()`.

The outcome is that `mock.ts` is deleted.

It supersedes [AdminOdyssey.md](AdminOdyssey.md), which was never carried out. Its decisions are kept: remove Branches, email-only notifications, live System Health with history, and a Dashboard built in the browser.

**Decisions locked in with you:**

| Page | Decision |
|---|---|
| Roles & Permissions | **Enforced from the DB.** A `role_permissions` table is seeded to match today's rules, and `requirePermission()` replaces `requireManager` route by route. |
| Backup & Restore | **Gzipped JSON snapshot in private S3** (`backups/`). Restore runs in one transaction. |
| Settings | **Only settings the system can enforce:** store name, support email, kiosk ordering on/off, maintenance mode. Security policy is a read-only "managed in Clerk" card. |
| Archive & Export | **Exports only** (CSV/JSON to S3). The archiving card is removed. |

**Defaults I chose (say if you disagree):**
- **Support tickets come from the storefront Contact form.** Its own comment says "No backend inbox exists for this yet".
- **"Reset password" becomes "Sign out everywhere".** Sign-in is through Clerk (email, Google or Microsoft), so the backend can't send a reset email. It revokes the user's sessions instead, and the user can use "Forgot password".
- **Suppliers aren't accounts.** They have no `clerk_id`, so the `supplier` role disappears from Users and Roles.

---

## Schema changes (all in `backend/init.sql`)

**No existing table is altered and no data migration is needed.** Everything below is additive and idempotent (`CREATE … IF NOT EXISTS`, `DO $$ … duplicate_object`), and `runInitSql` applies it at boot. Seeds never overwrite admin edits: they use `ON CONFLICT DO NOTHING` or seed only once.

### New enum types
| Type | Values | Used by |
|---|---|---|
| `log_severity` | `info`, `warning`, `critical` | `activity_logs` |
| `ticket_kind` | `complaint`, `bug` | `support_tickets` |
| `ticket_status` | `open`, `in_progress`, `resolved`, `closed` | `support_tickets` |
| `ticket_priority` | `low`, `medium`, `high`, `urgent` | `support_tickets` |
| `job_status` | `in_progress`, `completed`, `failed` | `backups`, `export_jobs` |
| `backup_kind` | `automatic`, `manual` | `backups` |
| `export_format` | `csv`, `json` | `export_jobs` |
| `notification_status` | `sent`, `failed`, `skipped` | `notification_log`, `ticket_messages` |

### New tables (11)
| Table | Purpose | Key columns |
|---|---|---|
| `role_permissions` | Permission matrix | `role employee_role`, `permission VARCHAR(50)`, PK `(role, permission)`. Admin rows are never stored, because admin implicitly has everything. |
| `system_settings` | Single row (`settings_id = 1`, like `payment_settings`) | **General:** `store_name`, `support_email`. **Ordering:** `online_ordering BOOL`. **Maintenance:** `maintenance_mode BOOL`, `maintenance_message TEXT`. **Backups:** `backup_enabled BOOL`, `backup_frequency VARCHAR CHECK IN ('hourly','daily','weekly')`, `backup_time TIME`, `backup_retention_days INT CHECK IN (7,30,90,365)`. **Audit:** `updated_at`, `updated_by → employees ON DELETE SET NULL` |
| `activity_logs` | Activity log and audit trail | `log_id BIGSERIAL`, `occurred_at`, `actor_clerk_id`, `actor_name`, `actor_role VARCHAR(20) CHECK IN (admin,manager,cashier,customer,system)`, `action TEXT`, `module VARCHAR(30)`, `ip VARCHAR(45)`, `severity log_severity`, `flag_reason TEXT NULL`, `flag_reviewed_by → employees`, `flag_reviewed_at`, `session_id VARCHAR UNIQUE NULL` (deduplicates sign-ins). Indexes: `(occurred_at DESC)`, plus a partial index `WHERE flag_reason IS NOT NULL AND flag_reviewed_at IS NULL` |
| `notification_templates` | Email templates | `template_id TEXT PK`, `event TEXT UNIQUE`, `name`, `subject`, `body`, `enabled BOOL`, `updated_at` |
| `notification_log` | Every send attempt | `log_id`, `template_id`, `order_id → orders ON DELETE SET NULL`, `recipient`, `status notification_status`, `error`, `latency_ms`, `sent_at` |
| `health_checks` | Probe history | `check_id BIGSERIAL`, `service VARCHAR(20)`, `ok BOOL`, `latency_ms INT`, `detail TEXT`, `checked_at`. Index `(service, checked_at DESC)` |
| `request_metrics` | Per-minute API stats | `minute TIMESTAMPTZ PK`, `requests INT`, `total_ms BIGINT`, `errors_5xx INT` |
| `support_tickets` | Tickets | `ticket_id SERIAL`, `kind`, `subject VARCHAR(150)`, `description`, `reporter_name`, `reporter_email`, `customer_id → customers ON DELETE SET NULL`, `order_id → orders ON DELETE SET NULL`, `priority` (default `medium`), `status` (default `open`), `created_at`, `updated_at` |
| `ticket_messages` | Staff replies | `message_id`, `ticket_id → support_tickets ON DELETE CASCADE`, `author_employee_id → employees ON DELETE SET NULL`, `author_name`, `body`, `email_status notification_status`, `created_at`. Index on `ticket_id` |
| `backups` | Index of S3 snapshots | `backup_id`, `kind backup_kind`, `status job_status`, `s3_key UNIQUE NULL`, `size_bytes BIGINT`, `table_counts JSONB`, `error`, `created_by → employees`, `created_at`, `finished_at` |
| `export_jobs` | Export history | `export_id`, `dataset VARCHAR(30)`, `format export_format`, `range_from DATE`, `range_to DATE`, `status job_status`, `s3_key`, `row_count`, `size_bytes`, `error`, `requested_by → employees`, `requested_at`, `finished_at` |

### Seeds
- **`role_permissions`:** seeded **once**, with `INSERT … SELECT … WHERE NOT EXISTS (SELECT 1 FROM role_permissions)`, so removing a box isn't undone on the next boot. The seed reproduces today's behaviour exactly; see the matrix in Phase 3.
- **`system_settings`:** `INSERT (settings_id) VALUES (1) ON CONFLICT DO NOTHING`, with column defaults matching today's mock values.
- **`notification_templates`:** four rows (`order-placed`, `order-completed`, `order-cancelled`, `payment-received`), `ON CONFLICT (template_id) DO NOTHING`.

### New env vars (`backend/.env.example`)
- `RESEND_API_KEY`, `NOTIFY_FROM`: email. Optional, guarded the way `isS3Configured()` is.
- `APP_URL`: the frontend origin, used as the redirect for Clerk staff invitations.

---

## Phase 0: Foundation (do first; everything depends on it)

1. **Admin gate (frontend).**
   - Create `Admin/layout/AdminGate.tsx`, a copy of [ManagerGate.tsx](frontend/src/Manager/layout/ManagerGate.tsx) that calls `GET /manager/me` and requires `employee_role === "admin"` and `active`.
   - In [AdminRoutes.tsx](frontend/src/Admin/AdminRoutes.tsx), wrap `<MainLayout/>` in it.
   - Styling uses `--admin-*` tokens.
2. **Link invited staff to Clerk (backend bug fix).**
   - Today, staff created from the Manager console get `clerk_id = invite_<uuid>` ([employee.controller.ts:122](backend/src/controllers/employee.controller.ts#L122)), and nothing ever replaces it, so they get a 403 when they sign in.
   - Fix this in `getCurrentEmployeeHandler` ([manager.controller.ts](backend/src/controllers/manager.controller.ts)). When there's no match on `clerk_id`, fetch the Clerk user, then run `UPDATE employees SET clerk_id=$1 WHERE clerk_id LIKE 'invite\_%' AND lower(employee_email) = ANY($2) RETURNING *`.
   - `$2` must contain **verified emails only**. That's what stops someone claiming an invite with an email they don't own.
3. **Close the open routes.**
   - [customer.route.ts](backend/src/routes/customer.route.ts): `GET /customers`, `GET/PUT/DELETE /customers/:id` have **no auth**. Add `protectRoute, requireAdmin`. No frontend calls them; `POST /customers` and `/customers/search` stay as they are.
   - [employee.routes.ts:16](backend/src/routes/employee.routes.ts#L16): `protectRoute` is commented out on `GET /employees/:id`. Restore it.
   - `GET /ingredients(/:id)` only requires sign-in, so customers can read it. Phase 3 gates it.
4. **Correct client IPs.** Add `app.set("trust proxy", 1)` in [server.ts](backend/src/server.ts). Render runs behind a proxy, so without this every IP in the activity log and the kiosk rate limiter is the proxy's.
5. **Remove Branches** (AdminOdyssey Phase 0, unchanged):
   - Delete `pages/Branches.tsx`.
   - Remove its route, nav entry and `routes.ts` key, plus `Branch`/`BranchStatus`/`AdminUser.branch`, `BRANCH_STATUS`, and the branch mock data.
6. **Shared frontend plumbing.**
   - `Admin/api/keys.ts`: an `adminKeys` factory shaped like [managerKeys](frontend/src/Manager/api/keys.ts). Move `gatewayKey` into it.
   - `Admin/components/QueryState.tsx`: copy the Manager's `Loading`/`ErrorNotice`/`LoadingRow`, restyled with admin tokens.
   - Move `ROLE_LABELS` and similar constants out of `mock.ts` into `Admin/labels.ts`.
7. **Shared backend plumbing.**
   - `lib/csv.ts`: move `csvCell` out of [report.controller.ts](backend/src/controllers/report.controller.ts) so exports reuse it.
   - `lib/s3.ts`: add `storePrivateObject(folder, fileName, body, contentType)` for backups and exports. The existing `storeFile` only takes multer uploads.
   - `lib/scheduler.ts`: `startScheduler()`, called from `startServer()` after `runInitSql`.
     - Ticks every 60 s inside `pg_try_advisory_lock`, so two instances never both run a job.
     - Later phases register their jobs here.
   - [admin.route.ts](backend/src/routes/admin.route.ts) becomes the `/api/admin` router, with **every** route behind `protectRoute, requireAdmin`. The old `/admin/customers` and `/admin/employees` handlers are deleted; nothing in the frontend calls them.

---

## Phase 1: Activity Logs (other phases write to it, so it comes early)

**Backend:**
- `providers/activity.provider.ts`:
  - `recordActivity(res, req, { action, module, severity?, flag? })` takes the actor from `res.locals.employee` and the IP from `req.ip`.
  - `recordSystemActivity(...)` is for scheduled jobs.
  - Both are fire-and-forget (`void …catch(log)`), so logging can never fail a request.
- **Sign-in capture:**
  - In `protectRoute`, check the request's Clerk `sessionId` against an in-memory set.
  - If it's new, insert a `sign_in` row (module `Auth`) with `ON CONFLICT (session_id) DO NOTHING`, then add it to the set.
  - The actor is resolved once per session, from employee or customer by `clerk_id`.
  - Failed sign-ins happen inside Clerk and **are not captured**. Say so in a code comment.
- **Events written** (add one line to each controller after it succeeds):

  | Module | Event | Flag rule (puts it in the audit trail) |
  |---|---|---|
  | Users | invite, role change, lock/unlock, deactivate/reactivate, sign-out-everywhere | **critical**, when the role is changed *to admin* |
  | Roles | permissions saved | none |
  | Settings | settings, payment gateway or notification template saved | **warning**, when maintenance mode is turned on |
  | Orders | order cancelled | **warning**, "Paid order cancelled", when payments exist |
  | Orders | order created with discount ≥ subtotal | **warning**, "Full-value discount" |
  | Menu | product created, deleted, or price changed (old → new); discount created, changed or deleted | none |
  | Inventory | stock movement of `waste` or `adjustment` | none |
  | Staff | employee created or updated by a manager | none |
  | Reports/Data | sales CSV export; data export | **warning**, when the export runs outside 06:00–22:00 Asia/Manila |
  | Backups | backup created, restored or deleted | **critical**, on restore |

- **Routes (`/api/admin/activity`):**
  - `GET /`, with filters `view=all|audit`, `severity`, `module`, `search`, `limit` (default 200) and a `before=<log_id>` cursor.
  - `GET /modules`
  - `PATCH /:id/review`, which sets `flag_reviewed_by` and `flag_reviewed_at`.
  - `GET /stats/sign-ins?days=7`, which counts per day grouped in `Asia/Manila`.

**Frontend, [ActivityLogs.tsx](frontend/src/Admin/pages/ActivityLogs.tsx):**

| Use case | Change |
|---|---|
| Browse and filter the log | `useActivity(filters)`. Filters go to the server, the module list comes from `useActivityModules()`, and a "Load more" button uses the cursor. |
| Audit trail tab | `view=audit`. The tab count is the number of unreviewed flags. |
| Mark reviewed | `useReviewActivity()` mutation, which invalidates `adminKeys.activity`. |
| Lock the actor from a flagged row | Calls the Phase 2 lock mutation with `actor_clerk_id`. Hidden for `system` rows. |
| Export CSV | Unchanged: `downloadCsv` over the loaded rows. |

**Type change.** `LogEntry` gains `actor_clerk_id`, and `flag` becomes `{ reason, reviewed_at }`.

---

## Phase 2: Users

**Backend (`/api/admin/users`, new `providers/admin-users.provider.ts`):**
- `GET /` returns employees ∪ customers, joined to Clerk through one `clerkClient.users.getUserList({ userId: [...], limit: 500 })` call.
- Status comes from data that already exists, so **no schema change** is needed:
  - `invited`: `clerk_id` starts with `invite_`.
  - `deactivated`: the employee is `inactive`, or the Clerk user is `banned`.
  - `locked`: the Clerk user is `locked`.
  - `active`: everything else.
- `last_active` comes from Clerk's `lastActiveAt`.

| Use case | Endpoint | What it does |
|---|---|---|
| List and filter users | `GET /admin/users` | as described above |
| Invite a staff member | `POST /admin/users` `{first_name,last_name,email,role,work_schedule}` | Inserts the employee with an `invite_` placeholder, then calls `clerkClient.invitations.createInvitation({ emailAddress, redirectUrl: APP_URL + "/sign-up", ignoreExisting: true })`. Phase 0's linking claims the row on first sign-in. |
| Change a staff role or schedule | `PATCH /admin/users/employees/:id` `{employee_role?, work_schedule?}` | Reuses `updateEmployee` |
| Lock / unlock | `POST /admin/users/:clerkId/lock`, `/unlock` | `clerkClient.users.lockUser` / `unlockUser`. Check that "user lockout" is enabled in the Clerk dashboard. |
| Deactivate / reactivate | `POST /admin/users/:clerkId/deactivate`, `/reactivate` | Employee: sets `employee_status` and bans/unbans in Clerk if linked. Customer: bans/unbans in Clerk. |
| Sign out everywhere | `POST /admin/users/:clerkId/sign-out` | Revokes every active Clerk session |

**Guards (409 with a clear message):**
- An admin can't change their own role, lock themselves or deactivate themselves.
- The last active admin can't be demoted or deactivated.
- Invited (unlinked) users can't be locked or signed out.

**Frontend, [Users.tsx](frontend/src/Admin/pages/Users.tsx):**
- Data:
  - `useAdminUsers()`, plus one mutation per row above, all invalidating `adminKeys.users`.
  - Row key becomes `clerk_id`.
- Columns and tabs:
  - Drop the Branch column.
  - Status tabs: All, Active, Invited, Locked, Deactivated.
  - The role dropdown shows only for employees (Admin, Manager, Cashier). Customers show a "Customer" label.
- Actions:
  - The "Reset password" action and modal become **"Sign out everywhere"**, with copy that points to "Forgot password".
- Create modal:
  - Role options are Admin, Manager, Cashier.
  - New required **Work schedule** field, because `employees.work_schedule` is `NOT NULL`.
  - Toast: "Invite sent to …".
- **Type change:**
  - `AdminUser = { clerk_id, kind: "employee"|"customer", id, first_name, last_name, email, role: StaffRole|"customer", status: "active"|"invited"|"locked"|"deactivated", last_active: string|null, work_schedule? }`
  - `Role` loses `supplier`.

---

## Phase 3: Roles & Permissions (enforced)

**The permission catalogue** lives in `backend/src/lib/permissions.ts` and is the single source of truth. It maps every permission to the routes it gates. The seed reproduces today's access exactly.

| Module | Permission | Gates | Cashier | Manager |
|---|---|---|---|---|
| Orders | `orders.view` | `GET /orders`, `GET /orders/:id` | ✓ | ✓ |
| Orders | `orders.process` | `POST /orders`, `POST /orders/:id/payments`, `PATCH …/complete`, `POST /payments/checkout-session`, `GET /customers/search`, `GET /discounts` | ✓ | ✓ |
| Orders | `orders.cancel` | `PATCH /orders/:id/cancel` | ✓ | ✓ |
| Menu & pricing | `menu.manage` | category/product create/update/delete, `GET/PUT /products/:id/ingredients` | | ✓ |
| Menu & pricing | `discounts.manage` | `POST/PATCH/DELETE /discounts` | | ✓ |
| Inventory | `inventory.view` | `GET /ingredients(/:id)` (**tightened**: was any signed-in user) | ✓ | ✓ |
| Inventory | `inventory.manage` | `POST/PUT /ingredients`, `GET/POST /stock-movements` | | ✓ |
| Inventory | `suppliers.manage` | `/suppliers*`, `/deliveries*` | | ✓ |
| Staff | `staff.manage` | `GET/POST/PUT /employees`, `GET /employees/:id` | | ✓ |
| Staff | `staff.attendance` | `GET /attendance` | | ✓ |
| Reports | `reports.view` | `GET /reports/sales` | | ✓ |
| Reports | `reports.export` | `GET /reports/sales/export` | | ✓ |
| Reports | `documents.manage` | `/logs*`, `/pdfs*` | | ✓ |
| System | `system.*` (users, roles, logs, tickets, health, settings, notifications, payments, backups) | `/api/admin/*`, `/payments/gateway*` | admin only, not editable | admin only, not editable |

- **Stays as `requireEmployee` (any active staff):**
  - `GET /manager/me`
  - `PATCH /attendance/:id/time-out` (self-service)
- **System rows stay admin-only.** The Admin console gate is role-based, so granting a manager `system.logs` couldn't open the console anyway.

**Backend:**
- **`requirePermission(id)` in [auth.middleware.ts](backend/src/middleware/auth.middleware.ts):**
  - One query: `SELECT e.*, (e.employee_role = 'admin' OR EXISTS (SELECT 1 FROM role_permissions WHERE role = e.employee_role AND permission = $2)) AS allowed FROM employees e WHERE clerk_id = $1`.
  - Inactive or not an employee → 403 "active employee account required".
  - Not allowed → 403 `Your role doesn't have "<label>"`.
  - Sets `res.locals.employee`, like the existing middleware.
- **Route sweep.** Replace `requireManager` and `requireManagerOrAdmin`, and the `requireEmployee` uses listed above, in these files:
  - `category`, `product`, `ingredients`, `supplier`, `delivery`, `stock-movement`, `discount`, `employee`, `attendance`, `report`, `document`, `order`, `payment` (checkout-session) and `customer` (search) routes.
  - Then delete `requireManager` and `requireManagerOrAdmin`.
- **Routes:**
  - `GET /api/admin/permissions` returns `{ catalogue, matrix: {manager: [], cashier: []} }`.
  - `PUT /api/admin/permissions` validates ids against the catalogue, rejects `system.*`, and replaces non-admin rows in one transaction.

**Frontend, [RolesPermissions.tsx](frontend/src/Admin/pages/RolesPermissions.tsx):**

| Use case | Change |
|---|---|
| View the matrix | `usePermissions()`. Columns are Admin (locked, all ticked), Manager and Cashier. System rows are disabled with the hint "Admin console only". |
| Role cards with user counts | Counts come from `useAdminUsers()` by role. |
| Save / discard | `useSavePermissions()`. The existing draft/dirty logic stays. Toast: "Takes effect on the next request". It's immediate, so the "next sign-in" copy goes. |

---

## Phase 4: Settings (enforceable only)

**Backend:**
- `GET /api/settings/public` (no auth) returns `{ store_name, support_email, online_ordering, maintenance_mode, maintenance_message }`.
- `GET` and `PUT /api/admin/settings` use `updateRow` with a column whitelist covering general, ordering and maintenance columns only.

**Enforcement** (what makes each setting real):

| Setting | Enforced where |
|---|---|
| Maintenance mode | `POST /kiosk/orders` returns 503 with `maintenance_message`. The kiosk shows a full-screen message instead of the menu. The storefront Home shows a banner. |
| Kiosk ordering (`online_ordering`) | `POST /kiosk/orders` returns 503 "Kiosk ordering is paused. Please order at the counter." The kiosk shows the same message. |
| Store name | `{{store_name}}` template variable and the email From display name (Phase 5) |
| Support email | `Reply-To` on every outgoing email (Phases 5–6). The Contact page shows it, falling back to `contact.config`. |

**Frontend, [Settings.tsx](frontend/src/Admin/pages/Settings.tsx):**
- Data: `useSettings()` / `useSaveSettings()`. Keep the sticky save bar.
- **Removed:**
  - Time zone and currency (hard-coded `Asia/Manila`/PHP across reports).
  - Order types, orders per slot, loyalty points.
  - The editable security fields.
- **Added:** a "Sign-in & security are managed in Clerk" card that lists session lifetime, lockout, password rules and 2FA, with a link to the Clerk dashboard.
- **Other screens:**
  - Kiosk: new `usePublicSettings()` in `kiosk/data/`.
  - Home: a banner component.

---

## Phase 5: Notification templates (email only; AdminOdyssey Phase 2, refined)

**Backend:**
- **`lib/notify.ts`:**
  - `isEmailConfigured()`.
  - `sendEmail({ to, subject, text, replyTo })` sends via `fetch` to the Resend API, so there's no new dependency.
  - `renderTemplate()` copies the regex from the frontend `fillTemplate`.
  - `notify(event, orderId)`: loads the template and the customer, skips and logs `skipped` when there's no customer email (kiosk orders), sends, then writes `notification_log`.
- **Events:**
  - `order.placed`: `createOrder` and the kiosk handler.
  - `order.completed` and `order.cancelled`: `transitionPendingOrder` callers.
  - `payment.received`: `payOrder` and the PayMongo webhook. It sends only if `payment_settings.send_email_receipt` **and** the template is enabled, so the existing Payment Gateway toggle keeps working.
- **Every call happens after the write succeeds, as `void notify(...)`.** A mail failure never fails an order.
- **Variables:** `customer_name`, `order_number`, `order_total`, `ordered_at`, `store_name`.
- **Routes (`/api/admin/notifications`):**
  - `GET /templates` → `{ templates, email_configured }`
  - `PUT /templates/:id`
  - `POST /templates/:id/test`: sends with sample values to the admin's own Clerk email.
  - `GET /log?limit=`

**Frontend, [NotificationTemplates.tsx](frontend/src/Admin/pages/NotificationTemplates.tsx):**

| Use case | Change |
|---|---|
| List and pick a template | `useNotificationTemplates()`. Drop the `CHANNELS` map, the SMS counter and the push "Title". |
| Edit, toggle and save | `useSaveTemplate()` |
| Send a test | `useSendTestTemplate()`. Toast the real result. |
| Insert variables and preview | `TEMPLATE_VARIABLES` / `TEMPLATE_SAMPLE` become the five real variables. |
| Email not set up | Notice banner when `email_configured` is false |

**Type change.** `NotificationTemplate` loses `channel`.

---

## Phase 6: Support tickets

**Backend:**
- **Public intake:**
  - `POST /api/support/tickets` with `{kind, subject, description, name, email, order_id?}`.
  - Rate-limited by a new `ticketLimiter` (5 per hour per IP) in [rateLimit.middleware.ts](backend/src/middleware/rateLimit.middleware.ts).
  - If a Clerk session is present, `getAuth` (without `protectRoute`) links `customer_id`.
- **Admin routes (`/api/admin/tickets`):**

| Use case | Endpoint |
|---|---|
| List by kind or status, with open counts | `GET /?kind=&include_closed=` |
| Read a ticket with its thread | `GET /:id` (ticket and `ticket_messages`) |
| Change status or priority | `PATCH /:id` (also bumps `updated_at`) |
| Reply, or reply and resolve | `POST /:id/replies` `{body, resolve}`. Inserts the message, emails the reporter through `sendEmail` with subject `Re: <subject> [T-<id>]` and `Reply-To` set to the support email, and stores `email_status`. Moves status `open → in_progress`, or to `resolved` if asked. |

- **Limitation:** the reporter's email replies land in the support inbox. They are **not** pulled back into the thread.

**Frontend:**
- [SupportTickets.tsx](frontend/src/Admin/pages/SupportTickets.tsx):
  - `useTickets()`, `useTicket(id)`, `useUpdateTicket()`, `useReplyToTicket()`.
  - The `STAFF_NAME` constant goes; the server sets the author.
  - Show `T-<id>` from the numeric id.
  - Toast a warning when `email_status` is `skipped` or `failed`.
- [ContactForm.tsx](frontend/src/Home/Contact/ContactForm.tsx):
  - Replace the `mailto:` submit with the public POST.
  - Add a "What's this about?" select (Feedback / complaint, or Something isn't working) and a Subject field.
  - Show success and error states. On a network error, show the support address.
- **Type change.** `Ticket.id: number`, the status value is `in_progress`, and replies become `messages: { author_name, body, created_at, email_status }[]`.

---

## Phase 7: System Health (AdminOdyssey Phase 3, refined)

**Backend, `lib/health.ts`:**

| Service | Probe (scheduler tick) |
|---|---|
| Database | Time a `SELECT 1`, and read pool `totalCount`/`idleCount`/`waitingCount`. |
| Authentication | A cheap `clerkClient.users.getCount()` |
| Storage (S3) | `HeadObject` on a sentinel `bulls-coffee/health/probe.txt` written at boot. *HeadBucket would 403, because the app's IAM user can't list the bucket.* |
| Payments | PayMongo `GET /v1/webhooks`, every 5th tick, only when `isPaymongoConfigured()` |
| Email | No network probe. State comes from `notification_log`: failures in the last hour make it degraded, and 3 consecutive failures make it down. |
| API | Up if the endpoint answers. Latency comes from `request_metrics`. |

- **`requestMetrics` middleware**, registered in `server.ts` before routes:
  - Times requests on `res.on("finish")`.
  - Counts 5xx responses into the current minute.
  - Keeps a `userId → lastSeen` Map, used for "active sessions in the last 15 min".
- **The scheduler job:**
  - Inserts `health_checks`.
  - Flushes `request_metrics`.
  - Prunes both after 30 days.
- **Routes:**
  - `GET /api/admin/health` returns `ServiceStatus[]` plus 30-day uptime, a 24 h hourly-average chart, the error rate for the last hour, active sessions, and resources:
    - CPU: `os.loadavg`
    - Memory: `os.totalmem`/`os.freemem`
    - Disk: `fs.statfs`
    - DB pool vs `max`
  - `POST /api/admin/health/diagnostics` runs every probe now and returns readable lines.
- **Caveats** (note them in code comments):
  - Counters are per process and reset on restart.
  - A sleeping Render free instance leaves gaps in the history.

**Frontend, [SystemHealth.tsx](frontend/src/Admin/pages/SystemHealth.tsx):**
- `useSystemHealth()` with `refetchInterval: 30_000`.
- "Run diagnostics" prints the mutation's lines in the console.
- **Remove:**
  - The Restart column and the `restarting` state.
  - The "Clear cache" and "Retry webhooks" tools; there's no cache and PayMongo retries on its own.
- Change "Median" to "Average" and "Across all branches" to "Signed in, last 15 min".

---

## Phase 8: Backup & Restore (JSON snapshot in S3)

**Backend, `lib/backup.ts`:**
- **`BACKUP_TABLES`** lists the tables in foreign-key order: employees, customers, categories, products, ingredients, product_ingredients, stock_movements, discounts, orders, order_items, payments, payment_settings, suppliers, supplier_ingredients, deliveries, delivery_items, feedback, documents, system_settings, role_permissions, notification_templates, support_tickets, ticket_messages.
- **`EXCLUDED`:** backups, export_jobs, activity_logs, notification_log, health_checks, request_metrics. The audit trail and the backup index must survive a restore.
- **At boot**, warn if `information_schema` has a table in neither list, so a future table isn't silently left out.
- **`createBackup(kind, employeeId)`:**
  - Inserts a row with status `in_progress`.
  - Reads every table in one `REPEATABLE READ` transaction, so the snapshot is consistent.
  - Gzips `{ version: 1, created_at, tables }` with the built-in `zlib` and stores it via `storePrivateObject("backups", …)`.
  - Updates `size_bytes`, `table_counts` and status.
  - The whole snapshot is in memory, which is fine at this shop's size; note it in a comment.
- **`restoreBackup(id, admin)`, in one transaction:**
  - `SET LOCAL lock_timeout = '10s'`.
  - `TRUNCATE <BACKUP_TABLES> RESTART IDENTITY CASCADE`.
  - Insert rows in order with `jsonb_populate_recordset`.
  - `setval` every serial sequence to its max.
  - **Refuse** (409) if the snapshot doesn't contain the requesting admin as an active admin, so a restore can't lock everyone out.
- **Scheduler jobs:**
  - Run an automatic backup when one is due by `backup_frequency`/`backup_time` (Asia/Manila), compared with the last automatic backup's `created_at`. This survives restarts.
  - Delete automatic backups older than `backup_retention_days` (the S3 object and the row). Manual backups are kept.
- **Routes (`/api/admin/backups`):**

| Use case | Endpoint |
|---|---|
| List backups and the schedule | `GET /` → `{ schedule, storage_configured, backups }` |
| Save the schedule | `PUT /schedule` (the backup columns of `system_settings`) |
| Back up now | `POST /` → 202 with the row; runs asynchronously. 409 if one is already in progress. |
| Download | `GET /:id/download` streams from S3 as `bullscoffee-backup-<date>.json.gz` |
| Restore | `POST /:id/restore` with `{ confirm: "RESTORE" }`, also checked on the server |
| Delete | `DELETE /:id` |

**Frontend, [Backups.tsx](frontend/src/Admin/pages/Backups.tsx):**
- Hooks:
  - `useBackups()`, with `refetchInterval: 2000` while any row is `in_progress`.
  - `useSaveBackupSchedule()`, `useCreateBackup()`, `useDeleteBackup()`, `useRestoreBackup()`.
  - After a restore, `queryClient.invalidateQueries()` with no key, so everything refreshes.
- Download uses `api.download` and `saveBlob`.
- Size is formatted from `size_bytes`.
- Show a "Storage isn't configured" notice and disable actions when `storage_configured` is false.
- **Type change.** `Backup` becomes `{ id: number, kind, status: job_status, size_bytes, created_at, finished_at, error }`.

---

## Phase 9: Archive & Export (exports only)

**Backend, `lib/exports.ts`:**
- **`DATASETS`:**
  - Orders: one row per order with totals, status, source, cashier and customer.
  - Payments
  - Customers
  - Employees
  - Inventory: ingredients with their current stock.
  - Activity logs
- `from`/`to` apply to orders, payments and activity, and are ignored for the others.
- **Formats:**
  - CSV: shared `csvCell`, with the UTF-8 BOM, like the sales export.
  - JSON
- Stored with `storePrivateObject("exports", …)`.
- **The scheduler deletes exports older than 7 days** (the S3 object and the row), which makes the UI's "links expire after 7 days" true.
- **Routes (`/api/admin/exports`):**
  - `GET /` → `{ datasets, storage_configured, jobs }`
  - `POST /` with `{dataset, format, from?, to?}` → 202 with the job, run asynchronously
  - `GET /:id/download`

**Frontend, [DataArchive.tsx](frontend/src/Admin/pages/DataArchive.tsx):**

| Use case | Change |
|---|---|
| Request an export | `useCreateExport()`. Formats are CSV and JSON only; XLSX and PDF are dropped. |
| See progress | `useExports()`, with `refetchInterval` while any job is `in_progress` |
| Download | `api.download` and `saveBlob` |
| Archiving | **Remove the card and its modal.** Retitle the page "Data Export" and update the nav label. The route stays `archive`, so old links still work. |

**Type change.** `ExportJob` uses `job_status`, `row_count` and `size_bytes`.

---

## Phase 10: Dashboard (built in the browser)

[Dashboard.tsx](frontend/src/Admin/pages/Dashboard.tsx) combines hooks that already exist by this point, like [Manager Dashboard](frontend/src/Manager/pages/Dashboard.tsx). No new backend is needed.

| Card | Source |
|---|---|
| Active accounts / locked / total | `useAdminUsers()` |
| Open tickets / urgent / latest 3 | `useTickets()` |
| Uptime, API response chart, Services | `useSystemHealth()` |
| Last backup | `useBackups()` |
| Sign-ins (7 days) | `useSignIns(7)` |
| Recent activity, suspicious-events banner | `useActivity({ limit: 6 })` and the audit count |

Each card shows its own loading and error state, so one failing source doesn't blank the page.

**Finish:**
- Delete `Admin/data/mock.ts` and `AdminOdyssey.md`.
- Update the header comment in [Admin/types.ts](frontend/src/Admin/types.ts) and the statuses in `Admin.md`.

---

## Phase 11: Update [REVISION.mmd](REVISION.mmd) (after the schema is built and every page reads from the API)

Start only when Phases 0–10 have landed: the 11 new tables exist in `init.sql`, and `grep -r "data/mock" frontend/src` returns nothing. The diagram then shows the admin schema that was actually built, not the earlier design.

**Scope.** Only the **System** module and RBAC change. The other modules (Sales, Menu, Inventory, Supply) and `BRANCHES` are still the target design and are left alone here. Branches is removed from the Admin console only; dropping it from the ERD is a separate decision.

**Header comments (lines 12–17):**
- Remove "Failed logins are written to AUDIT_LOGS". Failed sign-ins stay inside Clerk; only successful `sign_in` rows are logged (Phase 1).
- Replace "Backup & Restore, Monitor Performance, Generate / Export Reports … have no tables of their own" with: they now have `BACKUPS`, `HEALTH_CHECKS` / `REQUEST_METRICS`, and `EXPORT_JOBS`. Backup files and export files are stored in private S3; the tables only index them.
- Keep the note about payment gateway keys living in environment secrets.

**Staff / RBAC:**
- Delete `ROLES` and `PERMISSIONS` and their relationships.
- Redraw `ROLE_PERMISSIONS` as `role enum PK (manager / cashier)` + `permission varchar(50) PK`. Add a comment: the permission catalogue lives in `backend/src/lib/permissions.ts`, and admin rows are never stored.
- `EMPLOYEES`: replace `role_id FK` with `enum employee_role (admin / manager / cashier)`. Comment: invited staff hold `clerk_id = invite_<uuid>` until their first sign-in links it. Remove `locked` from `employee_status`; locking is done in Clerk.
- `CUSTOMERS`: remove `locked` from `customer_status` for the same reason.

**System module (replace the current boxes with what was built):**

| Old box | New box | Changes |
|---|---|---|
| `AUDIT_LOGS` | `ACTIVITY_LOGS` | Columns from the Schema section: `actor_role`, `module`, `severity`, `flag_reason`, `flag_reviewed_by → EMPLOYEES`, `flag_reviewed_at`, `session_id UK`. A row is in the audit trail when `flag_reason` is set, replacing `is_suspicious`. |
| `SYSTEM_SETTINGS` (key/value) | `SYSTEM_SETTINGS` (single row, `settings_id = 1`) | General, ordering, maintenance and backup-schedule columns, plus `updated_by → EMPLOYEES` |
| `NOTIFICATION_TEMPLATES` | same name | `template_id text PK`, `event UK`, `name`, `subject`, `body`, `enabled`. Drop `channel` (email only) and `updated_by`. |
| `NOTIFICATIONS` | `NOTIFICATION_LOG` | `template_id`, `order_id → ORDERS`, `recipient`, `status (sent / failed / skipped)`, `error`, `latency_ms`, `sent_at`. No customer, employee or supplier FKs. |
| `SUPPORT_TICKETS` | same name | `kind (complaint / bug)`, reporter name and email, `customer_id → CUSTOMERS`, `order_id → ORDERS`, `priority` with `urgent` instead of `critical`. Drop `feedback_id`, `reported_by` and `assigned_to`. |
| — | `TICKET_MESSAGES` | new: `ticket_id → SUPPORT_TICKETS CASCADE`, `author_employee_id → EMPLOYEES`, `body`, `email_status` |
| — | `HEALTH_CHECKS`, `REQUEST_METRICS` | new, with no FKs |
| — | `BACKUPS`, `EXPORT_JOBS` | new: `created_by` / `requested_by → EMPLOYEES` |
| — | `PAYMENT_SETTINGS` | new box for the existing single-row table |

- **Relationships:** rewrite the `%% System` block to match the table above. Add `systemBox` class lines for each new box and remove the deleted ones.
- **Check:** render the file (Mermaid Live, or the VS Code preview) and confirm it parses. Regenerate `RESET.png` / `system-architecture.png` only if they're meant to mirror REVISION.mmd.
- Commit on its own: `docs: sync REVISION.mmd with the admin schema`.

---

## Order of work and commits
Phase 0 → 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9 → 10 → 11, **one commit per phase**. CI (`backend: npm run build`, `frontend: npm run lint && npm run build`) passes after each.

Ordering constraints:
- Phase 3 must land in a single commit: it touches every route file.
- Phase 6's emails depend on Phase 5.
- Phase 10 depends on all the earlier phases.
- Phase 11 (REVISION.mmd) comes last, so the diagram shows what was built.
- **Payment Gateway** is already done; it only gets the Phase 1 activity line.

## Critical files
- **Backend, edit:**
  - `init.sql`, `server.ts`, `.env.example`
  - `middleware/auth.middleware.ts`, `middleware/rateLimit.middleware.ts`
  - `routes/*` (Phase 3 sweep), `routes/admin.route.ts`
  - `controllers/{manager,admin,order,kiosk,payment,products,discount,employee,stock-movement,report}.controller.ts`
  - `providers/order.provider.ts`
  - `lib/s3.ts`
- **Backend, new:**
  - `lib/{permissions,csv,scheduler,notify,health,backup,exports}.ts`
  - `providers/{activity,admin-users,settings,tickets,notifications}.provider.ts`
  - Matching controllers
  - `routes/{settings,support}.route.ts`
- **Frontend, new:**
  - `Admin/layout/AdminGate.tsx`, `Admin/components/QueryState.tsx`, `Admin/labels.ts`
  - `Admin/api/{keys,users,permissions,activity,settings,notifications,tickets,health,backups,exports}.ts`
- **Frontend, edit:**
  - Every `Admin/pages/*.tsx`
  - `Admin/{types,routes}.ts`, `AdminRoutes.tsx`, `layout/nav.ts`, `components/status.ts`
  - `Home/Contact/ContactForm.tsx`, the kiosk page, a Home banner
- **Delete:** `Admin/pages/Branches.tsx`, `Admin/data/mock.ts`, `AdminOdyssey.md`

## Verification
1. **Schema:** restart the backend. `\dt` shows the 11 new tables, and a second restart changes nothing: the seeds don't duplicate, and an unticked permission stays unticked.
2. **Auth:** for every `/api/admin/*` route, no token gives 401, a manager token gives 403, and an admin token gives 200. `/admin` in the browser shows the gate screens for signed-out and non-admin users.
3. **Permissions:** with the seed, the Manager console and POS behave exactly as before. Untick `orders.cancel` for cashier, and a cashier's cancel gets 403 with the permission name. Tick it again and it works, with no restart.
4. **Invites:** invite an email from Users. Sign up with that email, and the first `/manager/me` links the row, so the status goes Invited → Active.
5. **Users actions:** lock and deactivate a test account, then sign in as it and confirm Clerk blocks it. Self-demote and last-admin demote both return 409.
6. **Activity:** several page loads in one session make exactly one `sign_in` row. A full-discount order appears in the audit trail, and "Mark reviewed" clears it.
7. **Settings:** maintenance on makes the kiosk show the message, `POST /kiosk/orders` returns 503, and the Home banner appears. Off restores all three.
8. **Email:**
   - With `RESEND_API_KEY` set, "Send test" arrives, a customer order logs `sent`, and a kiosk order with no customer logs `skipped`.
   - With the key unset, orders still succeed and the pages show "not configured".
9. **Tickets:** a Contact form submission appears in Support Tickets. A reply emails the reporter, and the status moves to In progress.
10. **Health:** after 2 minutes, `health_checks` and `request_metrics` have rows, and "Run diagnostics" prints real probe results.
11. **Backups:**
    - "Back up now" completes, and the `.json.gz` downloads and opens.
    - Restore on a **dev database**: create an order, restore an earlier backup, and the order is gone. Sequences continue correctly, so new orders get new IDs.
    - The activity log keeps the restore event.
12. **Exports:** each dataset downloads as CSV and JSON. The CSV opens correctly in Excel.
13. **Dashboard:** no value comes from `mock.ts`. `grep -r "data/mock" frontend/src` returns nothing.
