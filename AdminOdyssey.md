# Admin: remove Branches, make Notifications / System Health / Dashboard real

## Context
Every Admin page reads from `frontend/src/Admin/data/mock.ts`. There is no `Admin/api/` folder, and the backend has only customer/employee CRUD at `/api/admin`. Decisions so far:
- **Remove** Branches.
- **Keep** Roles & Permissions, Activity Logs, Support Tickets, Backups, Data Archive and Settings. Payment Gateway stays on mock for now.
- **Notifications:** email only.
- **System Health:** real live checks plus history.
- **Dashboard:** built in the browser from other pages' data, like the Manager Dashboard.

This plan covers Branches removal plus making Notifications, System Health and Dashboard real. The other kept pages stay on mock and get wired in later plans.

Pattern to follow (already in the repo):
- Frontend hooks: `frontend/src/Manager/api/staff.ts` and `keys.ts` (`useApi()` + TanStack Query). The providers are already mounted in `frontend/src/main.tsx`.
- Backend: route → controller → provider, raw `pg` via `pool` (`backend/src/lib/db.ts`). Schema lives in `backend/init.sql` (idempotent, `IF NOT EXISTS`) and is applied at boot by `runInitSql`.
- Optional integrations are guarded the way `isS3Configured()` does it in `backend/src/lib/s3.ts`.

---

## Phase 0: Remove Branches (frontend only)
- Delete `frontend/src/Admin/pages/Branches.tsx`.
- `AdminRoutes.tsx`: drop the import and the `branches` route. `routes.ts`: drop `"branches"`. `layout/nav.ts`: drop the entry and the `FiMapPin` import.
- `types.ts`: remove `Branch`, `BranchStatus` and `AdminUser.branch`. `components/status.ts`: remove `BRANCH_STATUS` and its import.
- `data/mock.ts`: remove `BRANCHES`, `BRANCH_NAMES`, the `branch` field on `USERS`, and the `branch_name` template variable and sample.
- `pages/Users.tsx`: remove the Branch column, the Branch field in the create modal, `STAFF_ROLES`/`needsBranch`, and the branch logic in `changeRole`.
- `pages/SystemHealth.tsx`: change the "Across all branches" hint.

## Phase 1: Shared admin plumbing
- **Backend:** add `requireAdmin` to `backend/src/middleware/auth.middleware.ts`, modeled on `requireManager` (`employee_role === 'admin'`; that enum value already exists). Every new `/api/admin/*` route uses `protectRoute, requireAdmin`.
- **Frontend:** create `frontend/src/Admin/api/keys.ts` with an `adminKeys` factory (`["admin", ...]`), shaped like `managerKeys`. Each page gets its own `Admin/api/<domain>.ts`.
- **Frontend:** show loading and error states using the same approach as `Manager/components/QueryState` (reuse it or copy the small component into Admin).

## Phase 2: Notifications (email only)
**Schema (`init.sql`):**
- `notification_templates`
  - Columns: `template_id TEXT PK`, `event TEXT UNIQUE`, `name`, `subject`, `body`, `enabled BOOL`, `updated_at`.
  - Seed with `INSERT … ON CONFLICT DO NOTHING`.
- `notification_log`
  - Columns: `log_id`, `template_id`, `order_id`, `recipient`, `status` (`sent`/`failed`/`skipped`), `error`, `sent_at`.

**Events.** Use only events the system actually has:
- `order.placed` from `createOrder` and the kiosk handler.
- `order.completed` from `completeOrder`.
- `order.cancelled` from `cancelOrder`.
- `payment.received` from `payOrder`, which works as the receipt.

All four live in `backend/src/providers/order.provider.ts` and `controllers/kiosk.controller.ts`.

**Variables:** `customer_name`, `order_number`, `order_total`, `ordered_at`. Drop `points_balance`, `pickup_time`, `branch_name` and `reset_link`, and drop the `password-reset` template, because Clerk sends auth emails itself.

**`backend/src/lib/notify.ts`:**
- `isEmailConfigured()` checks env `RESEND_API_KEY` and `NOTIFY_FROM`. Add both to `.env.example`.
- `renderTemplate(text, vars)` copies the regex from the frontend `fillTemplate` in `Admin/utils/format.ts`.
- `notify(event, orderId)`:
  - Loads the enabled template and the order's customer.
  - Skips (and logs `skipped`) when there's no `customer_id`; kiosk orders often have none.
  - Sends a plain-text email via `fetch` to the Resend API. This needs no new dependency.
  - Writes to `notification_log`.
- Callers fire it **after** the order write succeeds (`void notify(...)`, errors caught and logged), so a mail failure never fails an order.

**Routes (`/api/admin/notifications`):**
- `GET /templates`
- `PUT /templates/:id` for name, subject, body and enabled.
- `POST /templates/:id/test` sends with sample values to the requesting admin's Clerk email.
- `GET /log?limit=` (optional, for a "recent sends" list).

**Frontend `pages/NotificationTemplates.tsx`:**
- Swap `TEMPLATES` for `useNotificationTemplates` / `useSaveTemplate` / `useSendTestTemplate` in `Admin/api/notifications.ts`.
- Remove the `CHANNELS` map, the SMS limit and the push "Title" branch, since every template is now email.
- Update `TEMPLATE_VARIABLES` / `TEMPLATE_SAMPLE` to the four real variables.
- Show a notice when the backend reports that email isn't configured.

## Phase 3: System Health (live checks + history)
**Schema:**
- `health_checks`
  - Columns: `service TEXT`, `ok BOOL`, `latency_ms INT`, `checked_at TIMESTAMPTZ`.
  - Index on `(service, checked_at)`.
- `request_metrics`
  - Columns: `minute TIMESTAMPTZ PK`, `requests INT`, `total_ms BIGINT`, `errors_5xx INT`.

**`backend/src/lib/health.ts`:**
- **Probes:**
  - `db`: time a `SELECT 1`; read the pool's `totalCount`/`idleCount`/`waitingCount`.
  - `auth`: time a cheap `clerkClient` call.
  - `storage`: an S3 head-bucket call, only when `isS3Configured()`.
  - `email`: only when `isEmailConfigured()`.
  - `api` is implicitly up if the endpoint answers.
- **`startHealthMonitor()`**, called from `startServer()` in `server.ts` after `runInitSql`:
  - Every 60 s it runs the probes and inserts into `health_checks`.
  - It flushes the in-memory request counters into `request_metrics`.
  - It deletes rows older than 30 days.
- **`requestMetrics` middleware**, registered in `server.ts` before the routes:
  - Times each request on `res.on('finish')`.
  - Counts 5xx responses into the current-minute bucket.
  - Records `getAuth(req).userId` with a last-seen timestamp in a Map, which gives the active-session count (distinct users in the last 15 min).
- **`resources()`:**
  - CPU: `os.loadavg()[0] / os.cpus().length`.
  - Memory: `os.totalmem()` / `os.freemem()`.
  - Disk: `fs.statfs('/')`.
  - DB connections: pool in use vs. `max`.

**Routes (`/api/admin/health`):**
- `GET /` returns a payload matching the existing `ServiceStatus` / `SeriesPoint` types:
  - **Service state:** `down` if the latest check failed; `degraded` if latency is over a threshold or 30-day uptime is under 99%; otherwise `operational`.
  - **Uptime:** ok ÷ total checks over 30 days, per service.
  - **24 h response chart:** hourly average from `request_metrics`.
  - **Error rate:** last hour.
  - **Also included:** active sessions and resources.
- `POST /diagnostics` runs the probes now and returns readable lines for the console.

**Frontend `pages/SystemHealth.tsx`:**
- Read from `useSystemHealth()` with `refetchInterval: 30_000`.
- Remove the Restart column and its handler. Remove the "Clear cache" and "Retry webhooks" tools, because there's no cache or webhooks to act on.
- "Run diagnostics" calls the mutation and prints the returned lines.
- Change the chart description from "Median" to "Average".

**Caveat to note in code comments:** the counters and the session Map are per-process, so they reset on restart and aren't shared across instances. The same limitation already applies to the rate limiter.

## Phase 4: Dashboard (built in the browser)
**Activity log.** This is the minimum the Dashboard needs, and the ActivityLogs page can be built on it later.
- **Schema:** `activity_logs`
  - Columns: `log_id`, `occurred_at`, `actor_clerk_id`, `actor_name`, `actor_role`, `action`, `module`, `ip`, `severity`, `flag_reason`, `flag_reviewed`.
  - Also `session_id TEXT UNIQUE NULL`, used to deduplicate sign-ins.
- **`backend/src/providers/activity.provider.ts`:** `recordActivity(...)`, `listActivity({limit, from, to})`, `signInsPerDay(days)`. The per-day count groups in `Asia/Manila`.
- **Sign-in capture.** In `protectRoute`, when the request's Clerk `sessionId` isn't in an in-memory seen-set, insert a `sign_in` row with `ON CONFLICT (session_id) DO NOTHING`, then add the id to the set. One Clerk session counts as one sign-in, with no webhook and no extra DB hit per request.
- **Routes:** `GET /api/admin/activity?limit=` and `GET /api/admin/stats/sign-ins?days=7`.

**Frontend `pages/Dashboard.tsx`:** combine the hooks, like `Manager/pages/Dashboard.tsx`.
- **Active accounts:** the existing `GET /admin/employees` + `/admin/customers` (new `Admin/api/users.ts` with `useEmployees`/`useCustomers`). Employees count active/inactive; customers count as active.
- **Uptime card + API response chart + Services list:** `useSystemHealth()` from Phase 3.
- **Sign-ins chart:** `useSignIns(7)`.
- **Recent activity + "suspicious events" banner:** `useActivity({limit: 6})`; the banner counts rows with `flag_reason` set and `flag_reviewed` false.
- **Open tickets / Last backup cards:** stay on `mock.ts` until those pages are wired, marked with a `// TODO: mock until tickets/backups API` comment.

---

## Critical files
- **Backend:**
  - Edit: `init.sql`, `server.ts`, `middleware/auth.middleware.ts`, `routes/admin.route.ts` (or new `routes/admin-*.route.ts` mounted under `/api/admin`), `providers/order.provider.ts`, `controllers/kiosk.controller.ts`, `.env.example`.
  - New: `lib/notify.ts`, `lib/health.ts`, `providers/activity.provider.ts`, plus the matching controllers.
- **Frontend:**
  - New: `Admin/api/{keys,notifications,health,activity,users}.ts`.
  - Edit: pages `NotificationTemplates.tsx`, `SystemHealth.tsx`, `Dashboard.tsx`, `Users.tsx`; `types.ts`, `data/mock.ts`, `routes.ts`, `layout/nav.ts`, `components/status.ts`, `AdminRoutes.tsx`.
  - Delete: `pages/Branches.tsx`.

## Verification
1. `cd backend && npm run build` (tsc) and `cd frontend && npm run build && npm run lint` both pass.
2. Start the backend with `npm run dev`. Confirm the new tables exist (`\dt` in psql), then wait 1–2 minutes and check that `health_checks` and `request_metrics` have rows.
3. Confirm `GET /api/admin/health` returns 401 without a token and 403 for a non-admin. As an admin, check that it returns services, uptime, the chart and resources.
4. Notifications:
   - With `RESEND_API_KEY` set, "Send test" delivers to the admin's email.
   - Placing an order for a customer writes a `sent` row to `notification_log`.
   - A kiosk order with no customer writes `skipped`.
   - With the key unset, orders still succeed and the page shows the "email not configured" notice.
5. Sign in as a user, then check `activity_logs` has exactly one `sign_in` row for that session across several page loads, and that the Dashboard's sign-ins chart shows it.
6. In the browser, `/admin/branches` redirects to the dashboard, nav has no Branches entry, and the Users page has no Branch column.
