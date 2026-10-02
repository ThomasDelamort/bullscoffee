/**
 * Row shapes the register gets from the API. Each mirrors a table in
 * backend/init.sql, plus the display columns the backend's providers join on
 * (e.g. customer_name on orders). Timestamps arrive as ISO strings; DECIMAL
 * columns arrive as strings and are converted to numbers in POS/api.
 */

export type OrderStatus = "pending" | "completed" | "cancelled";
export type PaymentMethod = "cash" | "card" | "e_wallet";
/** How the cashier takes payment: a method recorded here, or online through PayMongo, which records it once it clears. */
export type Tender = PaymentMethod | "online";
export type ItemSize = "tall" | "grade" | "venti";
export type DiscountKind = "percent" | "fixed";
/** What the cashier must check before the discount can be applied. */
export type DiscountEligibility = "none" | "university_id" | "government_id";
/** Rung up at this register, or placed by a customer at the kiosk and paid here. */
export type OrderSource = "counter" | "kiosk";
export type EmployeeRole = "cashier" | "manager" | "admin";

export interface Employee {
  employee_id: number;
  first_name: string;
  last_name: string;
  employee_role: EmployeeRole;
  employee_status: "active" | "inactive";
  profile_picture: string | null;
}

export interface Customer {
  customer_id: number;
  first_name: string;
  last_name: string;
  university_id: string | null;
  customer_email: string;
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
  price: number;
  is_available: boolean;
  /** Whether the POS asks for a size (tall / grande / venti). */
  has_sizes: boolean;
}

export interface Discount {
  discount_id: number;
  discount_name: string;
  kind: DiscountKind;
  value: number;
  eligibility: DiscountEligibility;
  is_active: boolean;
}

/** A row of GET /orders. */
export interface Order {
  order_id: number;
  customer_id: number | null;
  /** null for a kiosk order nobody at the counter has charged or closed yet. */
  employee_id: number | null;
  ordered_at: string;
  discount_amount: number;
  total_amount: number;
  order_status: OrderStatus;
  order_source: OrderSource;
  /** The preset behind discount_amount; null for none or a custom amount. */
  discount_id: number | null;
  customer_name: string | null;
  employee_name: string | null;
  discount_name: string | null;
  /** The total less payments so far. Above 0 only for a kiosk order not yet paid at the counter. */
  balance_due: number;
  item_summary: { product_name: string; quantity: number }[];
}

export interface OrderItem {
  order_item_id: number;
  order_id: number;
  product_id: number;
  quantity: number;
  size: ItemSize | null;
  selling_price: number;
  special_instructions: string | null;
}

export interface Payment {
  payment_id: number;
  order_id: number;
  amount_paid: number;
  payment_method: PaymentMethod;
  paid_at: string;
  /** Set for a payment taken online through PayMongo. */
  paymongo_payment_id: string | null;
}

/** GET /orders/:id: the row plus its lines and payments. */
export interface OrderDetails extends Order {
  items: (OrderItem & { product_name: string })[];
  payments: Payment[];
}
