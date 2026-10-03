# Admin & management use cases

What the back office can do, and where. Grounded in [backend/init.sql](backend/init.sql) (schema) and the routes under [backend/src/routes](backend/src/routes).

Status tags: ✅ done, 🟡 partial, ❌ not built yet.

Two consoles share one API:
- **Manager console** (`/manager`): runs the shop. Every route it calls checks a permission from the Roles & Permissions matrix (`requirePermission`).
- **Admin console** (`/admin`): runs the system. Every `/api/admin/*` route needs an active admin (`requireAdmin`).

## Access
- ✅ Admin console gate: only an active admin can open `/admin` ([AdminGate.tsx](frontend/src/Admin/layout/AdminGate.tsx))
- ✅ First admin: set `ADMIN_EMAIL` in `backend/.env`. While no admin is active, that address is made one at startup.
- ✅ Invite staff (Clerk invitation); the first sign-in with the invited, verified email links the account
- ✅ Users: list employees and customers with their Clerk state, change role or schedule, lock / unlock, deactivate / reactivate, sign out everywhere
- ✅ Guards: an admin can't demote, lock or deactivate themselves, and the last active admin can't be demoted or deactivated
- ✅ Roles & Permissions: a manager/cashier permission matrix, enforced on every request ([lib/permissions.ts](backend/src/lib/permissions.ts) is the catalogue)

## Staff (Manager console)
- ✅ Add and edit cashiers, set work schedules, activate / deactivate
- ✅ Attendance logs, with clock-out corrections

## Menu & pricing (Manager console)
- ✅ Categories, products (price, image, availability, sizes) and recipes (`product_ingredients`)
- ✅ Discounts (percent / fixed, eligibility checks)

## Inventory & supply (Manager console)
- ✅ Ingredients, stock movements (waste, adjustments; sales and deliveries write their own)
- ✅ Suppliers, price lists and deliveries

## Orders & reports
- ✅ POS (`/pos`) and kiosk (`/kiosk`) ordering; counter and PayMongo payments
- ✅ Orders list and detail, complete / cancel
- ✅ Daily / monthly sales reports and CSV export
- ❌ Customer feedback: the Manager page exists, but no `/api/feedback` route serves it yet

## System (Admin console)
- ✅ Activity log and audit trail: sign-ins and changes; suspicious events (paid cancellations, full-value discounts, new admins, maintenance on, off-hours exports, restores) are flagged until reviewed
- ✅ Support tickets from the storefront Contact form; replies are emailed to the reporter
- ✅ System health: per-minute probes of the database, Clerk, S3, PayMongo and email, 30-day uptime, response times and server resources
- ✅ Payment gateway: which PayMongo methods checkout offers, connection test
- ✅ Email notification templates (order placed, ready, cancelled, payment received) through Resend; optional (`RESEND_API_KEY`, `NOTIFY_FROM`)
- ✅ Settings: store name, support email, kiosk ordering on/off, maintenance mode. Sign-in security is managed in Clerk.
- ✅ Backup & restore: gzipped JSON snapshots in private S3, on a schedule and on demand; restore in one transaction
- ✅ Data export: orders, payments, customers, employees, inventory and the activity log, as CSV or JSON (kept 7 days)
- ✅ Dashboard: built in the browser from the pages above; each card loads on its own

The plan these were built from is [AdminExecution.md](AdminExecution.md).
