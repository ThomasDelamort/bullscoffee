# Manager API routes (planned)

Backend endpoints the Manager UI will need once it moves off mock data
(`data/mock.ts`) onto real API calls. Grouped by resource, matching the
tables in `backend/init.sql`.

## Image uploads

Products, categories, ingredients and suppliers each have an image. The UI
sends a file, not a URL, so their `POST` and `PATCH` endpoints must accept
`multipart/form-data` with a single `image` file field (JPEG, PNG, WebP or
GIF, max 5 MB), using `uploadSingle` + `uploadToS3` from
`backend/src/middleware/upload.middleware.ts`. The handler saves the resulting
`res.locals.fileUrl` into `image_url`. To remove an image, send an empty
`image_url` field with no file.

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
- `PATCH /api/orders/:id/complete`
- `PATCH /api/orders/:id/cancel`
- `GET /api/customers?search=` (for POS customer picker)

## Discounts

- `GET /api/discounts`
- `POST /api/discounts`
- `PATCH /api/discounts/:id`
- `DELETE /api/discounts/:id`

## Sales Reports

- `GET /api/reports/sales?period=daily|monthly&date=`
- `GET /api/reports/sales/export?...` (CSV)

## Feedback

- `GET /api/feedback` (filters: status, rating, search)
- `PATCH /api/feedback/:id` (status)

## Employees / Cashiers

- `GET /api/employees?role=cashier`
- `POST /api/employees`
- `PATCH /api/employees/:id` (details, work_schedule, status)

## Attendance

- `GET /api/attendance?from=&to=&employee_id=`
- `PATCH /api/attendance/:id` (set time_out)

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
