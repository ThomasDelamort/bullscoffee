/**
 * Row shapes for the cashier POS. Each interface mirrors a table in
 * backend/init.sql column-for-column, so swapping the mock store for API
 * calls needs no reshaping. Anything not in the schema is marked.
 */

export type OrderStatus = "pending" | "completed" | "cancelled";
export type PaymentMethod = "cash" | "card" | "e_wallet";
export type ItemSize = "tall" | "grade" | "venti";
export type DiscountKind = "percent" | "fixed";
/** What the cashier must check before the discount can be applied. */
export type DiscountEligibility = "none" | "university_id" | "government_id";
/** Not in the schema yet: walk-ins are rung up at the counter, online orders come from the storefront. */
export type OrderType = "walk_in" | "online";

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

export interface Order {
  order_id: number;
  customer_id: number | null;
  employee_id: number;
  ordered_at: string;
  discount_amount: number;
  total_amount: number;
  order_status: OrderStatus;
  /** Not in the schema yet. */
  order_type: OrderType;
  /** Not in the schema yet: which discount produced discount_amount, for the shift breakdown. */
  discount_id: number | null;
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
}

/** One array per table, as the POS store holds them. */
export interface PosDb {
  customers: Customer[];
  categories: Category[];
  products: Product[];
  discounts: Discount[];
  orders: Order[];
  order_items: OrderItem[];
  payments: Payment[];
}
