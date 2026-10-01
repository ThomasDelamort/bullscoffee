import type { OrderStatus, ReportPeriod, StockMovementReason } from "../types";

export interface OrderFilters {
  status?: OrderStatus;
  /** Inclusive, YYYY-MM-DD. */
  from?: string;
  /** Inclusive, YYYY-MM-DD. */
  to?: string;
  /** Matches order number, customer name or cashier name. */
  search?: string;
}

export interface AttendanceFilters {
  from?: string;
  to?: string;
  employee_id?: number;
}

export interface MovementFilters {
  reason?: StockMovementReason;
  ingredient_id?: number;
}

/**
 * Every manager query key, nested so a prefix invalidates a whole family:
 * invalidating `orders` refreshes every order list and every order detail.
 */
export const managerKeys = {
  all: ["manager"] as const,
  me: ["manager", "me"] as const,

  products: ["manager", "products"] as const,
  categories: ["manager", "categories"] as const,
  recipes: ["manager", "recipes"] as const,
  recipe: (productId: number) => ["manager", "recipes", productId] as const,

  ingredients: ["manager", "ingredients"] as const,
  movements: ["manager", "stock-movements"] as const,
  movementList: (filters: MovementFilters) => ["manager", "stock-movements", filters] as const,

  suppliers: ["manager", "suppliers"] as const,
  priceLists: ["manager", "price-lists"] as const,
  priceList: (supplierId: number) => ["manager", "price-lists", supplierId] as const,
  deliveries: ["manager", "deliveries"] as const,
  deliveryList: ["manager", "deliveries", "list"] as const,
  delivery: (deliveryId: number) => ["manager", "deliveries", "detail", deliveryId] as const,

  orders: ["manager", "orders"] as const,
  orderLists: ["manager", "orders", "list"] as const,
  orderList: (filters: OrderFilters) => ["manager", "orders", "list", filters] as const,
  order: (orderId: number) => ["manager", "orders", "detail", orderId] as const,

  employees: ["manager", "employees"] as const,
  attendance: ["manager", "attendance"] as const,
  attendanceList: (filters: AttendanceFilters) => ["manager", "attendance", filters] as const,

  reports: ["manager", "reports"] as const,
  salesReport: (period: ReportPeriod, date: string) => ["manager", "reports", "sales", period, date] as const,

  customerSearch: (term: string) => ["manager", "customers", "search", term] as const,
  feedback: ["manager", "feedback"] as const,
  discounts: ["manager", "discounts"] as const,
};
