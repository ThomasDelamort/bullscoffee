# Bull's Coffee — To-Do

## Fix first (bugs)

- [ ] Route collision: `admin.route.ts` and `customer.route.ts` both mount
      `GET/DELETE /customers/:id` at `/api` — admin's routes shadow the
      customer ones since it's mounted first in `backend/src/server.ts`.
      Decide whether `/customers` should still exist alongside
      `/admin/customers`, or merge them.
- [ ] Lock down employee and supplier routes — currently unauthenticated.
      Only `POST /customers` and `POST /admin/customers` require a Clerk
      session right now.
- [ ] Wire up `requireManager` (already written in `auth.middleware.ts` but
      unused) on admin/manager-only routes.

## Menu & ordering (core feature, currently 0% built)

- [ ] Build menu API: routes/controllers/providers for `categories` and
      `products` (tables already exist in `init.sql`).
- [ ] Build ingredients API for `ingredients` and `product_ingredients`.
- [ ] Replace the placeholder in `frontend/src/Home/Menu/Menu.tsx` with a
      real menu fetched from the API.
- [ ] Design + build cart state on the frontend.
- [ ] Build orders API: `orders` + `order_items` (create order, list,
      get by id).
- [ ] Build payments API: `payments` table, tied to an order.
- [ ] Checkout flow UI connecting cart → order → payment.

## Inventory & supply chain

- [ ] Ingredients/stock API: `stock_movements` (restock, consumption from
      orders).
- [ ] Supplier-ingredient linking API: `supplier_ingredients`.
- [ ] Deliveries API: `deliveries` + `delivery_items`.

## Staff-side

- [ ] Attendance API: `attendance_logs` (clock-in/out).
- [ ] Manager dashboard UI (staff records, inventory, sales overview) —
      depends on the APIs above.

## Smaller / polish

- [ ] Student discount logic using `customers.university_id` (field is
      captured but unused).
- [ ] Docker setup for backend + frontend + Postgres.
- [ ] Add a license file.

## Suggested phasing

1. **Phase 1** — fix auth/route bugs, read-only menu (categories/products
   API + real Menu page).
2. **Phase 2** — cart/checkout: orders, order_items, payments.
3. **Phase 3** — inventory: ingredients, stock_movements, suppliers,
   deliveries.
4. **Phase 4** — staff-side: attendance, manager dashboard.
5. **Phase 5** — polish: student discounts, Docker, license.
