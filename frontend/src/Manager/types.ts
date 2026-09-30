/**
 * Row shapes for the manager screens. Each interface mirrors a table in
 * RESET.mmd / backend/init.sql column-for-column, so swapping the mock store
 * for API calls needs no reshaping. Anything not in the schema is marked.
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

export interface Order {
  order_id: number;
  customer_id: number | null;
  employee_id: number;
  ordered_at: string;
  discount_amount: number;
  total_amount: number;
  order_status: OrderStatus;
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
  created_at: string;
  /** Not in the schema yet: whether the POS asks for a size (tall / grande / venti). */
  has_sizes: boolean;
}

export interface ProductIngredient {
  product_id: number;
  ingredient_id: number;
  quantity_required: number;
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

export interface SupplierIngredient {
  supplier_id: number;
  ingredient_id: number;
  unit_price: number;
}

export interface Delivery {
  delivery_id: number;
  supplier_id: number;
  employee_id: number;
  delivery_date: string;
}

export interface DeliveryItem {
  delivery_id: number;
  ingredient_id: number;
  quantity_received: number;
  unit_cost: number;
}

/* ---- Not in the schema yet: no feedback or discount tables exist. ---- */

export type FeedbackStatus = "new" | "reviewed";

export interface Feedback {
  feedback_id: number;
  customer_id: number | null;
  order_id: number | null;
  rating: 1 | 2 | 3 | 4 | 5;
  comment: string;
  status: FeedbackStatus;
  created_at: string;
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

/** One array per table, as the manager store holds them. */
export interface ManagerDb {
  employees: Employee[];
  attendance_logs: AttendanceLog[];
  customers: Customer[];
  orders: Order[];
  order_items: OrderItem[];
  payments: Payment[];
  categories: Category[];
  products: Product[];
  product_ingredients: ProductIngredient[];
  ingredients: Ingredient[];
  stock_movements: StockMovement[];
  suppliers: Supplier[];
  supplier_ingredients: SupplierIngredient[];
  deliveries: Delivery[];
  delivery_items: DeliveryItem[];
  feedback: Feedback[];
  discounts: Discount[];
}
