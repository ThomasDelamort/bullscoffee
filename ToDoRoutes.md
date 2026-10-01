# To-Do Routes

Route files still needed to wire up existing controller/provider functions. Existing route files
(`admin.route.ts`, `customer.route.ts`, `product.routes.ts`) are noted at the bottom with their gaps.

Convention observed in existing routes: `Router()` from express, `protectRoute` (and where relevant
`requireEmployee` / `requireManager`) from `../middleware/auth.middleware.ts`, handlers imported from
the matching `*.controller.ts`, mounted in `server.ts` via `app.use("/api...", xRoutes)`.

---

## 1. `category.route.ts`
Controller: `category.controller.ts`

| Method | Path | Handler | Middleware |
|---|---|---|---|
| GET | `/categories` | `getCategoriesHandler` | `protectRoute` |
| GET | `/categories/:id` | `getCategoryByIdHandler` | `protectRoute` |
| POST | `/categories` | `createCategoryHandler` | `protectRoute`, `requireManager` |
| PUT | `/categories/:id` | `updateCategoryHandler` | `protectRoute`, `requireManager` |
| DELETE | `/categories/:id` | `deleteCategoryHandler` | `protectRoute`, `requireManager` |

Note: `createCategoryHandler`/`updateCategoryHandler` read `image_url` from `req.body` — if image upload
is done in the same request, add `uploadSingle("image")`, `uploadToS3` before the handler (see products
pattern once confirmed), otherwise the frontend uploads separately and just sends the URL.

---

## 2. `ingredient.route.ts`
Controller: `ingredient.controller.ts`

| Method | Path | Handler | Middleware |
|---|---|---|---|
| GET | `/ingredients` | `getIngredientsHandler` | `protectRoute` |
| GET | `/ingredients/:id` | `getIngredientByIdHandler` | `protectRoute` |
| POST | `/ingredients` | `createIngredientHandler` | `protectRoute`, `requireManager` |
| PUT | `/ingredients/:id` | `updateIngredientHandler` | `protectRoute`, `requireManager` |

---

## 3. `supplier.route.ts`
Controller: `supplier.controller.ts`

| Method | Path | Handler | Middleware |
|---|---|---|---|
| GET | `/suppliers` | `getSuppliersHandler` | `protectRoute`, `requireManager` |
| GET | `/suppliers/:id` | `getSupplierByIdHandler` | `protectRoute`, `requireManager` |
| POST | `/suppliers` | `createSupplierHandler` | `protectRoute`, `requireManager` |
| PUT | `/suppliers/:id` | `updateSupplierHandler` | `protectRoute`, `requireManager` |
| GET | `/suppliers/:id/ingredients` | `getSupplierIngredientsHandler` | `protectRoute`, `requireManager` |
| PUT | `/suppliers/:id/ingredients` | `replaceSupplierIngredientsHandler` | `protectRoute`, `requireManager` |

---

## 4. `delivery.route.ts`
Controller: `delivery.controller.ts`

| Method | Path | Handler | Middleware |
|---|---|---|---|
| GET | `/deliveries` | `getDeliveriesHandler` | `protectRoute`, `requireManager` |
| GET | `/deliveries/:id` | `getDeliveryByIdHandler` | `protectRoute`, `requireManager` |
| POST | `/deliveries` | `createDeliveryHandler` | `protectRoute`, `requireManager` |

Query params supported by `getDeliveriesHandler`: `supplier_id`.

---

## 5. `stock-movement.route.ts`
Controller: `stock-movement.controller.ts`

| Method | Path | Handler | Middleware |
|---|---|---|---|
| GET | `/stock-movements` | `getStockMovementsHandler` | `protectRoute`, `requireManager` |
| POST | `/stock-movements` | `createStockMovementHandler` | `protectRoute`, `requireManager` |

Query params supported: `reason`, `ingredient_id`.

---

## 6. `order.route.ts`
Controller: `order.controller.ts`

| Method | Path | Handler | Middleware |
|---|---|---|---|
| GET | `/orders` | `getOrdersHandler` | `protectRoute`, `requireEmployee` |
| GET | `/orders/:id` | `getOrderByIdHandler` | `protectRoute`, `requireEmployee` |
| POST | `/orders` | `createOrderHandler` | `protectRoute`, `requireEmployee` |
| PATCH | `/orders/:id/complete` | `completeOrderHandler` | `protectRoute`, `requireEmployee` |
| PATCH | `/orders/:id/cancel` | `cancelOrderHandler` | `protectRoute`, `requireEmployee` |

Query params supported by `getOrdersHandler`: `status`, `from`, `to`, `search`, `employee_id`,
`customer_id`.

---

## 7. `attendance.route.ts`
Controller: `attendance.controller.ts`

| Method | Path | Handler | Middleware |
|---|---|---|---|
| GET | `/attendance` | `getAttendanceHandler` | `protectRoute`, `requireManager` |
| PATCH | `/attendance/:id/time-out` | `setAttendanceTimeOutHandler` | `protectRoute`, `requireEmployee` |

Query params supported by `getAttendanceHandler`: `from`, `to`, `employee_id`.
Body for time-out route: `{ time_out }`.

---

## 8. `employee.route.ts`
Controller: `employee.controller.ts` (note: separate from `admin.controller.ts`'s employee handlers,
which are already wired in `admin.route.ts` for create/list/get-by-id/delete)

| Method | Path | Handler | Middleware |
|---|---|---|---|
| GET | `/employees` | `getEmployeesHandler` | `protectRoute`, `requireManager` |
| GET | `/employees/:id` | `getEmployeeByIdHandler` | `protectRoute`, `requireManager` |
| POST | `/employees` | `createEmployeeHandler` | `protectRoute`, `requireManager` |
| PUT | `/employees/:id` | `updateEmployeeHandler` | `protectRoute`, `requireManager` |

Query params supported by `getEmployeesHandler`: `role`.

**Conflict to resolve:** both `admin.controller.ts` and `employee.controller.ts` export
`createEmployeeHandler` / `getAllEmployeesHandler(admin)` vs `getEmployeesHandler(employee)` /
`getEmployeeByIdHandler` covering overlapping ground (admin-only employee CRUD vs. manager-facing
employee management). Decide whether `/api/admin/employees` (admin-only, account provisioning) and
`/api/employees` (manager-facing, day-to-day) should both exist, or consolidate into one.

---

## 9. `manager.route.ts`
Controller: `manager.controller.ts`

| Method | Path | Handler | Middleware |
|---|---|---|---|
| GET | `/manager/me` | `getCurrentEmployeeHandler` | `protectRoute` |

---

## 10. `report.route.ts`
Controller: `report.controller.ts`

| Method | Path | Handler | Middleware |
|---|---|---|---|
| GET | `/reports/sales` | `getSalesReportHandler` | `protectRoute`, `requireManager` |
| GET | `/reports/sales/export` | `exportSalesReportHandler` | `protectRoute`, `requireManager` |

Query params supported: `period` (`daily`\|`monthly`, default `daily`), `date` (`YYYY-MM-DD`).

---

## Gaps in existing route files

### `product.routes.ts` (only 2 of 7 controller functions wired)
Missing:
| Method | Path | Handler | Middleware |
|---|---|---|---|
| POST | `/products` | `createProductHandler` | `protectRoute`, `requireManager` |
| PUT | `/products/:id` | `updateProductHandler` | `protectRoute`, `requireManager` |
| DELETE | `/products/:id` | `deleteProductHandler` | `protectRoute`, `requireManager` |
| GET | `/products/:id/ingredients` | `getProductIngredientsHandler` | `protectRoute`, `requireManager` |
| PUT | `/products/:id/ingredients` | `replaceProductIngredientsHandler` | `protectRoute`, `requireManager` |

Also missing `protectRoute` on the two existing GET routes (currently public) — confirm that's intended
(public menu browsing) before adding auth.

### `customer.route.ts` (missing 1 of 6 controller functions)
Missing:
| Method | Path | Handler | Middleware |
|---|---|---|---|
| GET | `/customers/search` | `searchCustomersHandler` | `protectRoute` |

Note: register `/customers/search` **before** `/customers/:id` so Express doesn't treat `search` as an
`:id` param.

### `admin.route.ts`
All 8 exported `admin.controller.ts` handlers are already wired (customers + employees CRUD, no update).
No gaps, but see the employee-route conflict noted above in section 8.

---

## Providers with no controller yet

- `providers/cashier.provider.ts` → `getOrders` — appears superseded by `order.provider.ts`'s
  `getOrders`/`getOrderById`/etc. Confirm whether `cashier.provider.ts` is dead code before building a
  route/controller around it.

## Remember to mount new routers in `server.ts`

```ts
app.use("/api", categoryRoutes);
app.use("/api", ingredientRoutes);
app.use("/api", supplierRoutes);
app.use("/api", deliveryRoutes);
app.use("/api", stockMovementRoutes);
app.use("/api", orderRoutes);
app.use("/api", attendanceRoutes);
app.use("/api", employeeRoutes);
app.use("/api", managerRoutes);
app.use("/api", reportRoutes);
```
