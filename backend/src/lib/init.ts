import fs from "fs";
import path from "path";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "url";
import { pool } from "./db.ts";
import { withTransaction } from "./sql.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const INIT_SQL_PATH = path.join(__dirname, "../../init.sql");

export async function runInitSql(): Promise<void> {
  const sql = fs.readFileSync(INIT_SQL_PATH, "utf-8");

  const client = await pool.connect();
  try {
    await client.query(sql);
    console.log("Database schema initialized successfully.");
  } catch (err) {
    console.error("Failed to initialize schema:", err);
    throw err;
  } finally {
    client.release();
  }
  await bootstrapAdmin();
}

// The admin console only opens for an active admin, and only an admin can
// make one, so a fresh database (or one whose last admin was lost) needs a
// way in. With ADMIN_EMAIL set and no active admin, that address becomes the
// admin: an existing employee with it is promoted, otherwise an invite row
// is added that their first sign-in claims (see claimInvitedEmployee). Once
// any admin exists this does nothing.
async function bootstrapAdmin(): Promise<void> {
  const email = process.env["ADMIN_EMAIL"]?.trim().toLowerCase();
  if (!email) return;

  const message = await withTransaction(async (client) => {
    // Two instances booting at once mustn't both add the invite.
    await client.query("LOCK TABLE employees IN SHARE ROW EXCLUSIVE MODE");
    const admins = await client.query(
      `SELECT 1 FROM employees WHERE employee_role = 'admin' AND employee_status = 'active' LIMIT 1`,
    );
    if ((admins.rowCount ?? 0) > 0) return null;

    const promoted = await client.query(
      `
        UPDATE employees SET employee_role = 'admin', employee_status = 'active'
        WHERE lower(employee_email) = $1
      `,
      [email],
    );
    if ((promoted.rowCount ?? 0) > 0) return `made ${email} an admin`;

    await client.query(
      `
        INSERT INTO employees (clerk_id, first_name, last_name, employee_email, employee_role, work_schedule)
        VALUES ($1, 'Store', 'Admin', $2, 'admin', 'Admin console')
      `,
      [`invite_${randomUUID()}`, email],
    );
    return `invited ${email} as admin; their first sign-in claims it`;
  });
  if (message) console.log(`No active admin (ADMIN_EMAIL): ${message}.`);
}
