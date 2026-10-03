import { pool } from "./db.ts";

// Customer emails, sent through Resend's HTTP API (https://resend.com) with
// plain fetch. Email is optional: without RESEND_API_KEY and NOTIFY_FROM,
// every send is logged as skipped and nothing else changes. A send never
// fails the request that caused it: callers fire notify() without awaiting
// it, after their own write has succeeded.

const RESEND_URL = "https://api.resend.com/emails";
const SEND_TIMEOUT_MS = 10_000;

export const isEmailConfigured = (): boolean =>
  Boolean(process.env["RESEND_API_KEY"] && process.env["NOTIFY_FROM"]);

export type NotifyEvent = "order.placed" | "order.completed" | "order.cancelled" | "payment.received";
export type SendStatus = "sent" | "failed" | "skipped";

/** The {{variables}} a template can use, with the sample values a test send fills in. */
export const TEMPLATE_VARIABLES = {
  customer_name: "Mika",
  order_number: "#1042",
  order_total: "₱355.00",
  ordered_at: "Oct 3, 2026, 9:40 AM",
  store_name: "Bull's Coffee",
} as const;

export type TemplateValues = Record<keyof typeof TEMPLATE_VARIABLES, string>;

/** Replaces {{token}} placeholders; unknown tokens are left as they are. */
export const renderTemplate = (text: string, values: Record<string, string>): string =>
  text.replace(/\{\{\s*(\w+)\s*\}\}/g, (match, key: string) => values[key] ?? match);

// NOTIFY_FROM may be a bare address or "Name <address>"; a bare one gets the
// store name as its display name.
const fromHeader = (storeName: string): string => {
  const from = process.env["NOTIFY_FROM"] ?? "";
  return from.includes("<") ? from : `"${storeName.replace(/"/g, "")}" <${from}>`;
};

export interface Email {
  to: string;
  subject: string;
  text: string;
  /** Where the customer's reply goes: the support email from Settings. */
  replyTo: string;
  storeName: string;
}

export interface SendResult {
  status: SendStatus;
  error: string | null;
  latency_ms: number | null;
}

/** Sends one email. Never throws: the result says what happened. */
export async function sendEmail(email: Email): Promise<SendResult> {
  if (!isEmailConfigured()) {
    return { status: "skipped", error: "Email isn't set up (RESEND_API_KEY / NOTIFY_FROM)", latency_ms: null };
  }
  const started = Date.now();
  try {
    const res = await fetch(RESEND_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env["RESEND_API_KEY"]}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromHeader(email.storeName),
        to: [email.to],
        subject: email.subject,
        text: email.text,
        reply_to: email.replyTo,
      }),
      signal: AbortSignal.timeout(SEND_TIMEOUT_MS),
    });
    const latency_ms = Date.now() - started;
    if (!res.ok) {
      const body: any = await res.json().catch(() => null);
      return { status: "failed", error: body?.message ?? `Resend answered ${res.status}`, latency_ms };
    }
    return { status: "sent", error: null, latency_ms };
  } catch (error: any) {
    return {
      status: "failed",
      error: error?.name === "TimeoutError" ? "Resend didn't answer in time" : (error?.message ?? "Send failed"),
      latency_ms: Date.now() - started,
    };
  }
}

export async function logSend(
  template_id: string | null,
  order_id: number | null,
  recipient: string | null,
  result: SendResult,
): Promise<void> {
  await pool.query(
    `
      INSERT INTO notification_log (template_id, order_id, recipient, status, error, latency_ms)
      VALUES ($1, $2, $3, $4, $5, $6)
    `,
    [template_id, order_id, recipient, result.status, result.error, result.latency_ms],
  );
}

const ORDERED_AT = new Intl.DateTimeFormat("en-PH", {
  timeZone: "Asia/Manila",
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

const peso = (amount: number | string): string =>
  `₱${Number(amount).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

async function deliver(event: NotifyEvent, order_id: number): Promise<void> {
  const result = await pool.query(
    `
      SELECT t.template_id, t.subject, t.body, t.enabled,
             s.store_name, s.support_email, p.send_email_receipt,
             o.order_id, o.total_amount, o.ordered_at,
             c.first_name, c.customer_email
      FROM notification_templates t
      CROSS JOIN system_settings s
      CROSS JOIN payment_settings p
      LEFT JOIN orders o ON o.order_id = $2
      LEFT JOIN customers c ON c.customer_id = o.customer_id
      WHERE t.event = $1
    `,
    [event, order_id],
  );
  const row = result.rows[0];
  // No template for the event: nothing to send, and nothing worth logging.
  if (!row || row.order_id === null) return;

  const skip = (reason: string) =>
    logSend(row.template_id, order_id, row.customer_email ?? null, {
      status: "skipped",
      error: reason,
      latency_ms: null,
    });

  if (!row.enabled) return skip("Template is switched off");
  // The Payment Gateway page's email-receipt switch also governs receipts.
  if (event === "payment.received" && !row.send_email_receipt) {
    return skip("Email receipts are off on the Payment Gateway page");
  }
  if (!row.customer_email) return skip("No customer on the order (walk-in or guest)");

  const values: TemplateValues = {
    customer_name: row.first_name ?? "there",
    order_number: `#${row.order_id}`,
    order_total: peso(row.total_amount),
    ordered_at: ORDERED_AT.format(new Date(row.ordered_at)),
    store_name: row.store_name,
  };
  const sent = await sendEmail({
    to: row.customer_email,
    subject: renderTemplate(row.subject, values),
    text: renderTemplate(row.body, values),
    replyTo: row.support_email,
    storeName: row.store_name,
  });
  await logSend(row.template_id, order_id, row.customer_email, sent);
}

/**
 * Emails the order's customer the template for `event`, and logs the
 * attempt. Fire and forget: call it without awaiting, after the change it
 * reports has been saved. Failures only reach the server log.
 */
export function notify(event: NotifyEvent, order_id: number): void {
  void deliver(event, order_id).catch((error) =>
    console.error(`notify(${event}, order #${order_id}) failed:`, error),
  );
}
