# Manager API routes

Backend endpoints behind the Manager UI. The screens fetch them through
TanStack Query hooks in `src/Manager/api/` (one file per resource; query keys
in `api/keys.ts`). Grouped by resource, matching the tables in
`backend/init.sql`.

Everything below is wired up except **Discounts** and **Feedback**: their
tables exist but their routes don't yet. The UI already calls the contract
listed for them and shows a "not supported yet" notice until they land.

Where this list says `PATCH /:id` for products, categories, ingredients,
suppliers and employees, the backend implements it as `PUT /:id` (still a
partial update), and that's what the UI calls.

## Image uploads

Products, categories, ingredients and suppliers each have an image. The UI
sends a file, not a URL, so their `POST` and `PATCH` endpoints must accept
`multipart/form-data` with a single `image` file field (JPEG, PNG, WebP or
GIF, max 5 MB), using `uploadFile("<kind>")` from
`backend/src/middleware/upload.middleware.ts`, which stores each kind in its
own S3 folder (`bulls-coffee/products/`, `categories/`, ...). The handler
saves the resulting `res.locals.fileUrl` into `image_url`. To remove an
image, send an empty `image_url` field with no file. `PUT /employees/:id`
takes the same `image` field for `profile_picture`.

## Logs and PDFs (manager or admin)

Upload with `multipart/form-data` and a single `file` field (max 10 MB).

- `GET /api/logs` — CSV logs, newest first (`uploaded_by_name` included)
- `POST /api/logs` — upload a `.csv`
- `GET /api/logs/:id/download` — the CSV itself. Logs are private: S3 won't
  serve them, so this is the only way to read one (use `api.download`)
- `GET /api/pdfs` — PDFs, newest first; each row's `file_url` opens it
- `POST /api/pdfs` — upload a PDF
- `DELETE /api/pdfs/:id`

## Auth / session

- `GET /api/manager/me` — current employee (id, role, name)

## Dashboard

- `GET /api/manager/dashboard` (or compose client-side from the endpoints below)

## Products & Categories

- `GET /api/products`
- `POST /api/products`
- `PATCH /api/products/:id`
- `DELETE /api/products/:id`
- `GET /api/categories`
- `POST /api/categories`
- `PATCH /api/categories/:id`
- `DELETE /api/categories/:id`
- `GET /api/products/:id/ingredients`
- `PUT /api/products/:id/ingredients` (replace recipe)

## Orders / POS

- `GET /api/orders` (filters: status, date range, employee, customer, search)
- `GET /api/orders/:id` (with items + payments)
- `POST /api/orders` (place order + items + payment, atomically)
- `POST /api/orders/:id/payments` (take payment for a kiosk order: `{ payment_method }`, charges the whole `balance_due`; the order stays pending)
- `PATCH /api/orders/:id/complete` (409 while `balance_due` > 0)
- `PATCH /api/orders/:id/cancel`

Every order row carries `balance_due`. It's above 0 only for a kiosk order
that hasn't been paid at the counter yet; those show as "Awaiting payment"
with a Take payment action in place of Complete.
- `GET /api/customers?search=` (for POS customer picker)

## Discounts (not built yet)

- `GET /api/discounts`
- `POST /api/discounts`
- `PATCH /api/discounts/:id`
- `DELETE /api/discounts/:id`

## Sales Reports

- `GET /api/reports/sales?period=daily|monthly&date=`
- `GET /api/reports/sales/export?...` (CSV)

## Feedback (not built yet)

- `GET /api/feedback` (filters: status, rating, search). Rows should include
  `customer_name`, like orders do.
- `PATCH /api/feedback/:id` (status)

## Employees / Cashiers

- `GET /api/employees?role=cashier`
- `POST /api/employees`
- `PATCH /api/employees/:id` (details, work_schedule, status)

## Attendance

- `GET /api/attendance?from=&to=&employee_id=`
- `PATCH /api/attendance/:id/time-out` (set time_out)

## Inventory

- `GET /api/ingredients`
- `POST /api/ingredients`
- `PATCH /api/ingredients/:id`
- `GET /api/stock-movements?reason=&ingredient_id=`
- `POST /api/stock-movements` (manual adjustment/waste)

## Suppliers

- `GET /api/suppliers`
- `POST /api/suppliers`
- `PATCH /api/suppliers/:id`
- `GET /api/suppliers/:id/ingredients` (price list)
- `PUT /api/suppliers/:id/ingredients` (replace price list)
- `GET /api/deliveries?supplier_id=`
- `GET /api/deliveries/:id` (with items)
- `POST /api/deliveries` (delivery + items, updates stock)
