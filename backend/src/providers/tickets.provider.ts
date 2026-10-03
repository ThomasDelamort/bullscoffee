import { pool } from "../lib/db.ts";
import { withTransaction } from "../lib/sql.ts";

export type TicketKind = "complaint" | "bug";
export type TicketStatus = "open" | "in_progress" | "resolved" | "closed";
export type TicketPriority = "low" | "medium" | "high" | "urgent";
export type EmailStatus = "sent" | "failed" | "skipped";

export interface Ticket {
  id: number;
  kind: TicketKind;
  subject: string;
  description: string;
  reporter_name: string;
  reporter_email: string;
  customer_id: number | null;
  order_id: number | null;
  priority: TicketPriority;
  status: TicketStatus;
  created_at: string;
  updated_at: string;
  message_count: number;
}

export interface TicketMessage {
  id: number;
  author_name: string;
  body: string;
  email_status: EmailStatus;
  created_at: string;
}

export interface NewTicket {
  kind: TicketKind;
  subject: string;
  description: string;
  reporter_name: string;
  reporter_email: string;
  customer_id: number | null;
  order_id: number | null;
}

const TICKET_COLUMNS = `
  t.ticket_id AS id, t.kind, t.subject, t.description, t.reporter_name, t.reporter_email,
  t.customer_id, t.order_id, t.priority, t.status, t.created_at, t.updated_at,
  (SELECT count(*)::int FROM ticket_messages m WHERE m.ticket_id = t.ticket_id) AS message_count
`;

// A named order is only linked when it exists: a mistyped number shouldn't
// lose the ticket.
export async function createTicket(ticket: NewTicket): Promise<Ticket> {
  const result = await pool.query(
    `
      INSERT INTO support_tickets (kind, subject, description, reporter_name, reporter_email, customer_id, order_id)
      VALUES ($1, $2, $3, $4, $5, $6, (SELECT order_id FROM orders WHERE order_id = $7))
      RETURNING ticket_id
    `,
    [
      ticket.kind,
      ticket.subject,
      ticket.description,
      ticket.reporter_name,
      ticket.reporter_email,
      ticket.customer_id,
      ticket.order_id,
    ],
  );
  const created = await getTicket(result.rows[0].ticket_id);
  if (!created) throw new Error("Created ticket could not be read back");
  return created;
}

export interface TicketList {
  tickets: Ticket[];
  /** Open or in-progress tickets of each kind, whatever the filters. */
  open: Record<TicketKind, number>;
}

export async function listTickets(filters: {
  kind?: TicketKind | undefined;
  include_closed: boolean;
}): Promise<TicketList> {
  const conditions: string[] = [];
  const values: unknown[] = [];
  if (filters.kind) {
    values.push(filters.kind);
    conditions.push(`t.kind = $${values.length}`);
  }
  if (!filters.include_closed) conditions.push(`t.status IN ('open', 'in_progress')`);
  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  const [tickets, open] = await Promise.all([
    pool.query(
      `
        SELECT ${TICKET_COLUMNS} FROM support_tickets t ${where}
        ORDER BY (t.status IN ('open', 'in_progress')) DESC,
                 array_position(ARRAY['urgent', 'high', 'medium', 'low']::ticket_priority[], t.priority),
                 t.created_at DESC
        LIMIT 500
      `,
      values,
    ),
    pool.query(
      `SELECT kind, count(*)::int AS count FROM support_tickets
       WHERE status IN ('open', 'in_progress') GROUP BY kind`,
    ),
  ]);
  const counts: Record<TicketKind, number> = { complaint: 0, bug: 0 };
  for (const row of open.rows) counts[row.kind as TicketKind] = row.count;
  return { tickets: tickets.rows, open: counts };
}

export async function getTicket(
  ticket_id: number,
): Promise<(Ticket & { messages: TicketMessage[] }) | undefined> {
  const ticket = await pool.query(`SELECT ${TICKET_COLUMNS} FROM support_tickets t WHERE t.ticket_id = $1`, [
    ticket_id,
  ]);
  if (!ticket.rows[0]) return undefined;
  const messages = await pool.query(
    `
      SELECT message_id AS id, author_name, body, email_status, created_at
      FROM ticket_messages WHERE ticket_id = $1 ORDER BY created_at, message_id
    `,
    [ticket_id],
  );
  return { ...ticket.rows[0], messages: messages.rows };
}

export async function updateTicket(
  ticket_id: number,
  changes: { status?: TicketStatus | undefined; priority?: TicketPriority | undefined },
): Promise<boolean> {
  const result = await pool.query(
    `
      UPDATE support_tickets
      SET status = COALESCE($2, status), priority = COALESCE($3, priority), updated_at = now()
      WHERE ticket_id = $1
    `,
    [ticket_id, changes.status ?? null, changes.priority ?? null],
  );
  return (result.rowCount ?? 0) > 0;
}

/**
 * Stores a staff reply and moves the ticket along: an open ticket becomes
 * in progress, or resolved when `resolve` is set.
 */
export async function addReply(
  ticket_id: number,
  reply: { author_employee_id: number; author_name: string; body: string; email_status: EmailStatus },
  resolve: boolean,
): Promise<void> {
  await withTransaction(async (client) => {
    await client.query(
      `
        INSERT INTO ticket_messages (ticket_id, author_employee_id, author_name, body, email_status)
        VALUES ($1, $2, $3, $4, $5)
      `,
      [ticket_id, reply.author_employee_id, reply.author_name, reply.body, reply.email_status],
    );
    await client.query(
      `
        UPDATE support_tickets
        SET status = CASE WHEN $2 THEN 'resolved'::ticket_status
                          WHEN status = 'open' THEN 'in_progress'::ticket_status
                          ELSE status END,
            updated_at = now()
        WHERE ticket_id = $1
      `,
      [ticket_id, resolve],
    );
  });
}
