import { pool } from "../lib/db.ts";
import type {
  ReportPeriod,
  SalesReport,
  SalesExportRow,
} from "../types/report.types.ts";

const pad = (n: number): string => String(n).padStart(2, "0");

const today = (): string => {
  const now = new Date();
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
};

// Daily covers that date, monthly covers the month containing it. Only
// completed orders count toward sales.
const rangeFor = (period: ReportPeriod, date: string) => ({
  start: period === "monthly" ? `${date.slice(0, 7)}-01` : date,
  step: period === "monthly" ? "1 month" : "1 day",
});

export const getSalesReport = async (
  period: ReportPeriod,
  date: string = today(),
): Promise<SalesReport> => {
  const { start, step } = rangeFor(period, date);
  const range = [start, step];
  const inRange = `
      o.order_status = 'completed'
      AND o.ordered_at >= $1::date
      AND o.ordered_at < $1::date + $2::interval
  `;

  const summary = await pool.query(
    `
      SELECT COUNT(*)::int AS order_count,
             COALESCE(SUM(o.total_amount + o.discount_amount), 0)::float8 AS gross_sales,
             COALESCE(SUM(o.discount_amount), 0)::float8 AS discounts,
             COALESCE(SUM(o.total_amount), 0)::float8 AS net_sales
      FROM orders o
      WHERE ${inRange}
    `,
    range,
  );

  const series =
    period === "daily"
      ? await pool.query(
          `
            SELECT lpad(h::text, 2, '0') || ':00' AS label,
                   COALESCE(SUM(o.total_amount), 0)::float8 AS value
            FROM generate_series(0, 23) AS h
            LEFT JOIN orders o
              ON ${inRange} AND EXTRACT(HOUR FROM o.ordered_at) = h
            GROUP BY h
            ORDER BY h
          `,
          range,
        )
      : await pool.query(
          `
            SELECT to_char(d, 'DD') AS label,
                   COALESCE(SUM(o.total_amount), 0)::float8 AS value
            FROM generate_series($1::timestamp, $1::timestamp + $2::interval - interval '1 day', interval '1 day') AS d
            LEFT JOIN orders o
              ON ${inRange} AND o.ordered_at::date = d::date
            GROUP BY d
            ORDER BY d
          `,
          range,
        );

  const topProducts = await pool.query(
    `
      SELECT p.product_id, p.product_name,
             SUM(oi.quantity)::int AS units_sold,
             SUM(oi.quantity * oi.selling_price)::float8 AS revenue
      FROM orders o
      JOIN order_items oi ON oi.order_id = o.order_id
      JOIN products p ON p.product_id = oi.product_id
      WHERE ${inRange}
      GROUP BY p.product_id, p.product_name
      ORDER BY units_sold DESC, revenue DESC
      LIMIT 5
    `,
    range,
  );

  const paymentMethods = await pool.query(
    `
      SELECT pay.payment_method::text AS payment_method,
             SUM(pay.amount_paid)::float8 AS amount
      FROM orders o
      JOIN payments pay ON pay.order_id = o.order_id
      WHERE ${inRange}
      GROUP BY pay.payment_method
      ORDER BY amount DESC
    `,
    range,
  );

  return {
    period,
    start,
    summary: summary.rows[0],
    series: series.rows,
    top_products: topProducts.rows,
    payment_methods: paymentMethods.rows,
  };
};

// One row per completed order in the period, for the CSV export. The
// controller does the CSV formatting.
export const getSalesExportRows = async (
  period: ReportPeriod,
  date: string = today(),
): Promise<SalesExportRow[]> => {
  const { start, step } = rangeFor(period, date);
  const result = await pool.query(
    `
      SELECT o.order_id, o.ordered_at,
             (e.first_name || ' ' || e.last_name) AS cashier,
             (c.first_name || ' ' || c.last_name) AS customer,
             o.discount_amount, o.total_amount,
             (SELECT string_agg(DISTINCT pay.payment_method::text, ', ')
              FROM payments pay WHERE pay.order_id = o.order_id) AS payment_methods
      FROM orders o
      LEFT JOIN employees e ON e.employee_id = o.employee_id
      LEFT JOIN customers c ON c.customer_id = o.customer_id
      WHERE o.order_status = 'completed'
        AND o.ordered_at >= $1::date
        AND o.ordered_at < $1::date + $2::interval
      ORDER BY o.ordered_at
    `,
    [start, step],
  );
  return result.rows;
};
