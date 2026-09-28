export interface Order {
  order_id?: number;
  customer_id: number;
  employee_id: number;
  order_at: Date | string;
  discount_amount: number;
  total_amount: number;
  order_status: "pending" | "completed" | "cancelled";
}

export interface Order_Items {
  order_item_id?: number;
  order_id: number;
  product_id: number;
  quantity: number;
  selling: number;
}

export interface payments {
  payment_id?: number;
  order_id: number;
  amount_paid: number;
  payment_method: "cash" | "card" | "e_wallet";
  paid_at?: Date;
}
