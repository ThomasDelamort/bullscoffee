export type OrderStatus = "pending" | "completed" | "cancelled";
export type PaymentMethod = "cash" | "card" | "e_wallet";
export type ItemSize = "tall" | "grade" | "venti";

export interface OrderRow {
  order_id: number;
  customer_id: number | null;
  /** null for a kiosk order nobody at the counter has handled yet. */
  employee_id: number | null;
  ordered_at: Date;
  discount_amount: number;
  total_amount: number;
  order_status: OrderStatus;
}

export interface OrderItemRow {
  order_item_id: number;
  order_id: number;
  product_id: number;
  quantity: number;
  size: ItemSize | null;
  selling_price: number;
  special_instructions: string | null;
}

export interface PaymentRow {
  payment_id: number;
  order_id: number;
  amount_paid: number;
  payment_method: PaymentMethod;
  paid_at: Date;
}

export interface OrderFilters {
  status?: OrderStatus | undefined;
  /** Inclusive, YYYY-MM-DD */
  from?: string | undefined;
  /** Inclusive, YYYY-MM-DD */
  to?: string | undefined;
  employee_id?: number | undefined;
  customer_id?: number | undefined;
  /** Matches order id, customer name or cashier name */
  search?: string | undefined;
}

export interface NewOrderItem {
  product_id: number;
  quantity: number;
  size: ItemSize | null;
  /** Price per unit, size upcharge included. The POS works this out. */
  selling_price: number;
  special_instructions: string | null;
}

export interface NewOrder {
  customer_id: number | null;
  /** null for a kiosk order. */
  employee_id: number | null;
  discount_amount: number;
  items: NewOrderItem[];
  /** Omit to leave the order pending and unpaid. */
  payment?: Pick<PaymentRow, "amount_paid" | "payment_method"> | undefined;
  /** Defaults to completed when a payment is given, pending otherwise. */
  order_status?: OrderStatus | undefined;
}

export interface OrderListRow extends OrderRow {
  customer_name: string | null;
  employee_name: string | null;
  /** The total less payments so far. Above 0 only for an order placed unpaid, i.e. from the kiosk. */
  balance_due: number;
}

export interface OrderDetails extends OrderListRow {
  items: (OrderItemRow & { product_name: string })[];
  payments: PaymentRow[];
}
