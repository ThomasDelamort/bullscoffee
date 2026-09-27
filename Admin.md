# Admin Use Cases — Bull's Coffee

Grounded in [backend/init.sql](backend/init.sql) (schema) and [TODO.md](TODO.md) (roadmap).

Status tags: ✅ done, 🟡 partial, ❌ not built yet.

## Staff management

- ✅ Create / view / list / delete employees
- ❌ Update an employee's role, status, or work schedule (e.g. promote cashier → manager, deactivate on termination)
- ❌ View/manage attendance (`attendance_logs`) — clock-in/out, hours worked
- ❌ Restrict staff-management actions to managers only via `requireManager` (middleware already written in `auth.middleware.ts`, just unused)

## Customer management

- ✅ Create / view / list / delete customers
- ❌ Update customer details (contact info, `university_id` for student discount)
- ❌ Look up a customer's order history (depends on orders API)

## Menu management

- ❌ CRUD for `categories`
- ❌ CRUD for `products` — name, price, description, image, availability toggle
- ❌ Manage `product_ingredients` (recipe/BOM: which ingredients + quantities a product consumes)

> Core gap per `TODO.md` — 0% built, blocks the real menu page.

## Inventory management

- ❌ CRUD for `ingredients` (name, unit, current quantity, minimum stock level, active flag)
- ❌ Record `stock_movements` (restock, sale-driven consumption, waste, manual adjustment)
- ❌ Low-stock alerts/reporting based on `minimum_stock_level`

## Supplier & procurement

- ✅ CRUD for suppliers
- ❌ Manage `supplier_ingredients` (which supplier provides which ingredient, at what price)
- ❌ Record `deliveries` and `delivery_items` (receive stock, update inventory)

## Sales / order oversight

- ❌ View/list orders, filter by status (`pending` / `completed` / `cancelled`)
- ❌ View order detail (`order_items`) and associated `payments`
- ❌ Cancel or refund an order
- ❌ Sales reporting (revenue by day/product/employee)

## Dashboard / reporting

- ❌ Manager dashboard aggregating staff records, inventory levels, sales overview
- ❌ Analytics: top-selling products, revenue trends, discount usage

## Access control

- ❌ Apply `requireManager` to gate all admin actions behind manager-role + active-status
- ❌ Fix route-shadowing bug: `admin.route.ts` and `customer.route.ts` both claim `GET/DELETE /customers/:id` at `/api` (admin wins since it's mounted first in `server.ts`)

## Suggested next step

Per `TODO.md` phasing, menu management (categories/products) is the highest-value next admin use case — it unblocks the customer-facing menu page, currently a placeholder in [frontend/src/Home/Menu/Menu.tsx](frontend/src/Home/Menu/Menu.tsx).
