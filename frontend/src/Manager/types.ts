/**
 * Row shapes the manager screens get from the API. Each mirrors a table in
 * backend/init.sql, plus the joined display columns the backend's providers
 * add (e.g. employee_name on attendance). Timestamps arrive as ISO strings.
 */

export type EmployeeStatus = "active" | "inactive";
export type EmployeeRole = "cashier" | "manager";
export type OrderStatus = "pending" | "completed" | "cancelled";
export type PaymentMethod = "cash" | "card" | "e_wallet";
export type StockMovementReason = "delivery" | "sale" | "waste" | "adjustment";
export type ItemSize = "tall" | "grade" | "venti";

export interface Employee {
  employee_id: number;
  clerk_id: string;
  first_name: string;
  last_name: string;
  employee_email: string;
  contact_number: string | null;
  profile_picture: string | null;
  employee_status: EmployeeStatus;
  employee_role: EmployeeRole;
  work_schedule: string;
  created_at: string;
}

export interface AttendanceLog {
  log_id: number;
  employee_id: number;
  time_in: string;
  time_out: string | null;
  employee_name: string;
}

export interface Customer {
  customer_id: number;
  clerk_id: string;
  first_name: string;
  last_name: string;
  university_id: string | null;
  customer_email: string;
  contact_number: string | null;
  profile_picture: string | null;
  created_at: string;
}

/** A row of GET /orders. */
export interface Order {
  order_id: number;
  customer_id: number | null;
  employee_id: number;
  ordered_at: string;
  discount_amount: number;
  total_amount: number;
  order_status: OrderStatus;
  customer_name: string | null;
  employee_name: string;
}

export interface OrderItem {
  order_item_id: number;
  order_id: number;
  product_id: number;
  quantity: number;
  size: ItemSize | null;
  selling_price: number;
  special_instructions: string | null;
  product_name: string;
}

export interface Payment {
  payment_id: number;
  order_id: number;
  amount_paid: number;
  payment_method: PaymentMethod;
  paid_at: string;
}

/** GET /orders/:id: the order with its lines and payments. */
export interface OrderDetails extends Order {
  items: OrderItem[];
  payments: Payment[];
}

export interface Category {
  category_id: number;
  category_name: string;
  image_url: string | null;
}

export interface Product {
  product_id: number;
  category_id: number;
  product_name: string;
  description: string | null;
  image_url: string | null;
  /** The tall price when has_sizes is set. */
  price: number;
  is_available: boolean;
  /** Whether the POS asks for a size (tall / grande / venti). */
  has_sizes: boolean;
  created_at: string;
}

/** One line of a product's recipe (GET /products/:id/ingredients). */
export interface ProductIngredient {
  product_id: number;
  ingredient_id: number;
  quantity_required: number;
  ingredient_name: string;
  unit_of_measure: string;
}

export interface Ingredient {
  ingredient_id: number;
  ingredient_name: string;
  unit_of_measure: string;
  image_url: string | null;
  current_quantity: number;
  minimum_stock_level: number;
  is_active: boolean;
}

export interface StockMovement {
  movement_id: number;
  ingredient_id: number;
  employee_id: number;
  quantity_change: number;
  reason: StockMovementReason;
  moved_at: string;
  ingredient_name: string;
  unit_of_measure: string;
  employee_name: string;
}

export interface Supplier {
  supplier_id: number;
  supplier_name: string;
  contact_person: string | null;
  supplier_email: string;
  contact_number: string | null;
  image_url: string | null;
  supplier_address: string | null;
  is_active: boolean;
  created_at: string;
}

/** One line of a supplier's price list (GET /suppliers/:id/ingredients). */
export interface SupplierIngredient {
  supplier_id: number;
  ingredient_id: number;
  unit_price: number;
  ingredient_name: string;
  unit_of_measure: string;
}

/** A row of GET /deliveries. */
export interface Delivery {
  delivery_id: number;
  supplier_id: number;
  employee_id: number;
  delivery_date: string;
  supplier_name: string;
  employee_name: string;
  item_count: number;
  total_cost: number;
}

export interface DeliveryItem {
  delivery_id: number;
  ingredient_id: number;
  quantity_received: number;
  unit_cost: number;
  ingredient_name: string;
  unit_of_measure: string;
}

export interface DeliveryDetails extends Delivery {
  items: DeliveryItem[];
}

export type ReportPeriod = "daily" | "monthly";

/** GET /reports/sales. Only completed orders count. */
export interface SalesReport {
  period: ReportPeriod;
  /** First day covered, YYYY-MM-DD. */
  start: string;
  summary: {
    order_count: number;
    gross_sales: number;
    discounts: number;
    net_sales: number;
  };
  /** Net sales per hour ("07:00") for daily, per day of the month ("07") for monthly. */
  series: SeriesPoint[];
  /** Best sellers, at most five. */
  top_products: {
    product_id: number;
    product_name: string;
    units_sold: number;
    revenue: number;
  }[];
  payment_methods: { payment_method: PaymentMethod; amount: number }[];
}

/* ---- The feedback and discounts tables exist, but their routes don't yet.
        These follow the planned contract in frontend/ManagerRoutes.md. ---- */

export type FeedbackStatus = "new" | "reviewed";

export interface Feedback {
  feedback_id: number;
  customer_id: number | null;
  order_id: number | null;
  rating: 1 | 2 | 3 | 4 | 5;
  comment: string;
  status: FeedbackStatus;
  created_at: string;
  /** Joined for display, like customer_name on orders. */
  customer_name?: string | null;
}

export type DiscountKind = "percent" | "fixed";
/** What the cashier must check before the discount can be applied. */
export type DiscountEligibility = "none" | "university_id" | "government_id";

export interface Discount {
  discount_id: number;
  discount_name: string;
  kind: DiscountKind;
  value: number;
  eligibility: DiscountEligibility;
  is_active: boolean;
}

export interface SeriesPoint {
  label: string;
  value: number;
}
