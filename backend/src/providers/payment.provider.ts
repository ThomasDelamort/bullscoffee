import { pool } from "../lib/db.ts";
import { paymongoRequest, type PaymongoMethod } from "../lib/paymongo.ts";
import { updateRow } from "../lib/sql.ts";
import type { ItemSize, OrderSource, OrderStatus, PaymentMethod } from "../types/order.types.ts";
import { getOrderById } from "./order.provider.ts";

export interface PaymentSettings {
  enabled_methods: PaymongoMethod[];
  send_email_receipt: boolean;
}

const SETTINGS_COLUMNS = ["enabled_methods", "send_email_receipt"] as const;

export const getPaymentSettings = async (): Promise<PaymentSettings> => {
  const result = await pool.query(
    `SELECT enabled_methods, send_email_receipt FROM payment_settings WHERE settings_id = 1`,
  );
  return result.rows[0];
};

export const updatePaymentSettings = async (
  changes: Partial<PaymentSettings>,
): Promise<PaymentSettings> => {
  const row = await updateRow<PaymentSettings & { settings_id: number }>(
    "payment_settings",
    "settings_id",
    1,
    SETTINGS_COLUMNS,
    changes,
  );
  if (!row) throw new Error("payment_settings row is missing");
  return { enabled_methods: row.enabled_methods, send_email_receipt: row.send_email_receipt };
};

// The menu's names for the sizes, as the customer saw them when ordering.
const SIZE_NAMES: Record<ItemSize, string> = {
  tall: "Tall",
  grade: "Grande",
  venti: "Venti",
};

// pg returns DECIMAL columns as strings, hence the Number().
const toCentavos = (pesos: number | string): number =>
  Math.round(Number(pesos) * 100);

// PayMongo only redirects; the return page works out the rest from the order.
const returnUrl = (base: string, order_id: number): string => {
  const url = new URL(base);
  url.searchParams.set("order_id", String(order_id));
  return url.toString();
};

export type CheckoutResult =
  | { status: "created"; checkout_url: string; session_id: string }
  | { status: "not_found" | "not_pending" | "nothing_due" | "no_methods" };

interface CheckoutSessionResponse {
  data: { id: string; attributes: { checkout_url: string } };
}

// A hosted PayMongo checkout for what's still owed on a pending order. The
// customer is charged the balance, not the line items: those are listed one
// by one when they add up to it, and folded into one "Order #N" line when a
// discount or an earlier payment means they don't. Payment is confirmed by
// the webhook, never by the customer landing on the success page.
export const createCheckoutSession = async (
  order_id: number,
): Promise<CheckoutResult> => {
  const order = await getOrderById(order_id);
  if (!order) return { status: "not_found" };
  if (order.order_status !== "pending") return { status: "not_pending" };
  const due = toCentavos(order.balance_due);
  if (due <= 0) return { status: "nothing_due" };

  const settings = await getPaymentSettings();
  if (settings.enabled_methods.length === 0) return { status: "no_methods" };

  const description = `Bull's Coffee order #${order_id}`;
  const itemized = order.items.map((item) => ({
    name: item.size
      ? `${item.product_name} (${SIZE_NAMES[item.size]})`
      : item.product_name,
    amount: toCentavos(item.selling_price),
    currency: "PHP",
    quantity: item.quantity,
  }));
  const itemizedTotal = itemized.reduce(
    (sum, line) => sum + line.amount * line.quantity,
    0,
  );

  const session = await paymongoRequest<CheckoutSessionResponse>(
    "POST",
    "/checkout_sessions",
    {
      line_items:
        itemizedTotal === due
          ? itemized
          : [{ name: description, amount: due, currency: "PHP", quantity: 1 }],
      payment_method_types: settings.enabled_methods,
      description,
      show_description: true,
      show_line_items: true,
      send_email_receipt: settings.send_email_receipt,
      reference_number: String(order_id),
      success_url: returnUrl(process.env["PAYMONGO_SUCCESS_URL"] ?? "", order_id),
      cancel_url: returnUrl(process.env["PAYMONGO_CANCEL_URL"] ?? "", order_id),
      metadata: { order_id: String(order_id) },
    },
  );

  return {
    status: "created",
    checkout_url: session.data.attributes.checkout_url,
    session_id: session.data.id,
  };
};

export interface OnlinePayment {
  order_id: number;
  amount_paid: number;
  payment_method: PaymentMethod;
  paymongo_payment_id: string;
}

export type RecordPaymentResult =
  | { status: "recorded"; order_status: OrderStatus }
  | { status: "duplicate" | "unknown_order" };

// Records a payment PayMongo confirmed. A retried webhook finds its payment
// already there and changes nothing. Like a payment taken at the counter, it
// leaves the order pending: paid, it's now in the barista's queue, and is
// completed once it's handed over. It's recorded even if the order has been
// cancelled since, because the money was taken and has to be refunded.
export const recordOnlinePayment = async (
  payment: OnlinePayment,
): Promise<RecordPaymentResult> => {
  try {
    const result = await pool.query(
      `
        INSERT INTO payments (order_id, amount_paid, payment_method, paymongo_payment_id)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (paymongo_payment_id) DO NOTHING
        RETURNING (SELECT order_status FROM orders WHERE order_id = $1) AS order_status
      `,
      [
        payment.order_id,
        payment.amount_paid,
        payment.payment_method,
        payment.paymongo_payment_id,
      ],
    );
    const row = result.rows[0];
    return row
      ? { status: "recorded", order_status: row.order_status }
      : { status: "duplicate" };
  } catch (error: any) {
    // Foreign key violation: no such order
    if (error?.code === "23503") return { status: "unknown_order" };
    throw error;
  }
};

export interface OrderPaymentStatus {
  order_id: number;
  order_source: OrderSource;
  order_status: OrderStatus;
  paid: boolean;
}

// Just enough for the public checkout return page to say whether the payment
// went through: nothing about who ordered or what.
export const getOrderPaymentStatus = async (
  order_id: number,
): Promise<OrderPaymentStatus | undefined> => {
  const result = await pool.query(
    `
      SELECT o.order_id, o.order_source, o.order_status,
             o.total_amount <= COALESCE(
               (SELECT SUM(pay.amount_paid) FROM payments pay WHERE pay.order_id = o.order_id), 0
             ) AS paid
      FROM orders o
      WHERE o.order_id = $1
    `,
    [order_id],
  );
  return result.rows[0];
};
