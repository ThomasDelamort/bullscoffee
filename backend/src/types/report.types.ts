export type ReportPeriod = "daily" | "monthly";

export interface SalesSummary {
  order_count: number;
  gross_sales: number;
  discounts: number;
  net_sales: number;
}

export interface SalesPoint {
  label: string;
  value: number;
}

export interface TopProduct {
  product_id: number;
  product_name: string;
  units_sold: number;
  revenue: number;
}

export interface PaymentBreakdown {
  payment_method: string;
  amount: number;
}
export interface SalesReport {
  period: ReportPeriod;
  /** First day covered, YYYY-MM-DD */
  start: string;
  summary: SalesSummary;
  /** Net sales per hour (daily) or per day of the month (monthly) */
  series: SalesPoint[];
  top_products: TopProduct[];
  payment_methods: PaymentBreakdown[];
}

export interface SalesExportRow {
  order_id: number;
  ordered_at: Date;
  cashier: string;
  customer: string | null;
  discount_amount: number;
  total_amount: number;
  payment_methods: string | null;
}
