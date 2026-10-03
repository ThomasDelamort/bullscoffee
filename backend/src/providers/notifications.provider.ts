import { pool } from "../lib/db.ts";

export interface NotificationTemplate {
  id: string;
  event: string;
  name: string;
  subject: string;
  body: string;
  enabled: boolean;
  updated_at: string;
}

export type TemplateChanges = Partial<Pick<NotificationTemplate, "name" | "subject" | "body" | "enabled">>;

const TEMPLATE_COLUMNS = `template_id AS id, event, name, subject, body, enabled, updated_at`;

// In the order an order goes through them.
const EVENT_ORDER = `array_position(ARRAY['order.placed', 'order.completed', 'order.cancelled', 'payment.received']::varchar[], event)`;

export async function listTemplates(): Promise<NotificationTemplate[]> {
  const result = await pool.query(
    `SELECT ${TEMPLATE_COLUMNS} FROM notification_templates ORDER BY ${EVENT_ORDER} NULLS LAST, template_id`,
  );
  return result.rows;
}

export async function getTemplate(template_id: string): Promise<NotificationTemplate | undefined> {
  const result = await pool.query(
    `SELECT ${TEMPLATE_COLUMNS} FROM notification_templates WHERE template_id = $1`,
    [template_id],
  );
  return result.rows[0];
}

export async function updateTemplate(
  template_id: string,
  changes: TemplateChanges,
): Promise<NotificationTemplate | undefined> {
  const columns = (["name", "subject", "body", "enabled"] as const).filter((c) => changes[c] !== undefined);
  if (columns.length === 0) return getTemplate(template_id);
  const assignments = columns.map((column, i) => `${column} = $${i + 2}`).join(", ");
  const result = await pool.query(
    `
      UPDATE notification_templates SET ${assignments}, updated_at = now()
      WHERE template_id = $1
      RETURNING ${TEMPLATE_COLUMNS}
    `,
    [template_id, ...columns.map((column) => changes[column])],
  );
  return result.rows[0];
}

export interface NotificationLogEntry {
  id: number;
  template_id: string | null;
  template_name: string | null;
  order_id: number | null;
  recipient: string | null;
  status: "sent" | "failed" | "skipped";
  error: string | null;
  latency_ms: number | null;
  sent_at: string;
}

export async function getNotificationLog(limit: number): Promise<NotificationLogEntry[]> {
  const result = await pool.query(
    `
      SELECT l.log_id::int AS id, l.template_id,
             COALESCE(t.name, CASE WHEN l.template_id = 'ticket-reply' THEN 'Support ticket reply' END) AS template_name,
             l.order_id,
             l.recipient, l.status, l.error, l.latency_ms, l.sent_at
      FROM notification_log l
      LEFT JOIN notification_templates t ON t.template_id = l.template_id
      ORDER BY l.log_id DESC
      LIMIT $1
    `,
    [limit],
  );
  return result.rows;
}
