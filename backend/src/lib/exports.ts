import { pool } from "./db.ts";
import { toCsv } from "./csv.ts";
import { deleteFile, isS3Configured, storePrivateObject } from "./s3.ts";
import { registerJob } from "./scheduler.ts";

// Data exports: a dataset as CSV or JSON, written to private S3
// (bulls-coffee/exports/) in the background and kept for 7 days. Times are
// in store time (Asia/Manila) and amounts are numbers, so a file reads the
// same in Excel as on screen.

const KEEP_DAYS = 7;
const LOCAL = (column: string) => `to_char(${column} AT TIME ZONE 'Asia/Manila', 'YYYY-MM-DD HH24:MI:SS')`;
const IN_RANGE = (column: string, from: string, to: string) =>
  `(${column} AT TIME ZONE 'Asia/Manila')::date BETWEEN COALESCE(${from}::date, '-infinity') AND COALESCE(${to}::date, 'infinity')`;

interface Dataset {
  label: string;
  /** Whether from / to apply. */
  ranged: boolean;
  columns: readonly string[];
  /** Ranged datasets take $1 = from and $2 = to (either may be null); the rest take no parameters. */
  sql: string;
}

export const DATASETS = {
  orders: {
    label: "Orders",
    ranged: true,
    columns: [
      "order_id", "ordered_at", "status", "source", "cashier", "customer", "discount",
      "discount_amount", "total_amount", "amount_paid", "items",
    ],
    sql: `
      SELECT o.order_id, ${LOCAL("o.ordered_at")} AS ordered_at, o.order_status AS status, o.order_source AS source,
             e.first_name || ' ' || e.last_name AS cashier,
             c.first_name || ' ' || c.last_name AS customer,
             d.discount_name AS discount,
             o.discount_amount::float AS discount_amount, o.total_amount::float AS total_amount,
             COALESCE((SELECT sum(p.amount_paid) FROM payments p WHERE p.order_id = o.order_id), 0)::float AS amount_paid,
             (SELECT string_agg(oi.quantity || ' x ' || pr.product_name, '; ' ORDER BY oi.order_item_id)
              FROM order_items oi JOIN products pr ON pr.product_id = oi.product_id
              WHERE oi.order_id = o.order_id) AS items
      FROM orders o
      LEFT JOIN employees e ON e.employee_id = o.employee_id
      LEFT JOIN customers c ON c.customer_id = o.customer_id
      LEFT JOIN discounts d ON d.discount_id = o.discount_id
      WHERE ${IN_RANGE("o.ordered_at", "$1", "$2")}
      ORDER BY o.ordered_at, o.order_id
    `,
  },
  payments: {
    label: "Payments",
    ranged: true,
    columns: ["payment_id", "order_id", "paid_at", "method", "amount_paid", "paymongo_payment_id"],
    sql: `
      SELECT payment_id, order_id, ${LOCAL("paid_at")} AS paid_at, payment_method AS method,
             amount_paid::float AS amount_paid, paymongo_payment_id
      FROM payments
      WHERE ${IN_RANGE("paid_at", "$1", "$2")}
      ORDER BY paid_at, payment_id
    `,
  },
  customers: {
    label: "Customers",
    ranged: false,
    columns: ["customer_id", "first_name", "last_name", "email", "university_id", "contact_number", "created_at"],
    sql: `
      SELECT customer_id, first_name, last_name, customer_email AS email, university_id, contact_number,
             ${LOCAL("created_at")} AS created_at
      FROM customers
      ORDER BY customer_id
    `,
  },
  employees: {
    label: "Employees",
    ranged: false,
    columns: ["employee_id", "first_name", "last_name", "email", "role", "status", "work_schedule", "contact_number", "created_at"],
    sql: `
      SELECT employee_id, first_name, last_name, employee_email AS email, employee_role AS role,
             employee_status AS status, work_schedule, contact_number, ${LOCAL("created_at")} AS created_at
      FROM employees
      ORDER BY employee_id
    `,
  },
  inventory: {
    label: "Inventory",
    ranged: false,
    columns: ["ingredient_id", "ingredient", "unit", "current_quantity", "minimum_stock_level", "low_stock", "active"],
    sql: `
      SELECT ingredient_id, ingredient_name AS ingredient, unit_of_measure AS unit,
             current_quantity::float AS current_quantity, minimum_stock_level::float AS minimum_stock_level,
             current_quantity <= minimum_stock_level AS low_stock, is_active AS active
      FROM ingredients
      ORDER BY ingredient_name
    `,
  },
  activity: {
    label: "Activity log",
    ranged: true,
    columns: ["log_id", "occurred_at", "actor", "role", "module", "action", "ip", "severity", "flag", "reviewed_by", "reviewed_at"],
    sql: `
      SELECT log_id::int AS log_id, ${LOCAL("occurred_at")} AS occurred_at, actor_name AS actor, actor_role AS role,
             module, action, ip, severity, flag_reason AS flag, flag_reviewed_by AS reviewed_by,
             ${LOCAL("flag_reviewed_at")} AS reviewed_at
      FROM activity_logs
      WHERE ${IN_RANGE("occurred_at", "$1", "$2")}
      ORDER BY log_id
    `,
  },
} as const satisfies Record<string, Dataset>;

export type DatasetId = keyof typeof DATASETS;
export const isDatasetId = (value: unknown): value is DatasetId =>
  typeof value === "string" && Object.hasOwn(DATASETS, value);

export const datasetList = () =>
  (Object.keys(DATASETS) as DatasetId[]).map((id) => ({ id, label: DATASETS[id].label, ranged: DATASETS[id].ranged }));

export interface ExportJob {
  id: number;
  dataset: DatasetId;
  format: "csv" | "json";
  range_from: string | null;
  range_to: string | null;
  status: "in_progress" | "completed" | "failed";
  row_count: number | null;
  size_bytes: number | null;
  error: string | null;
  requested_by_name: string | null;
  requested_at: string;
  finished_at: string | null;
}

const JOB_COLUMNS = `export_id AS id, dataset, format, to_char(range_from, 'YYYY-MM-DD') AS range_from,
  to_char(range_to, 'YYYY-MM-DD') AS range_to, status, row_count, size_bytes::float AS size_bytes, error,
  requested_by_name, requested_at, finished_at`;

export interface ExportRequest {
  dataset: DatasetId;
  format: "csv" | "json";
  from: string | null;
  to: string | null;
}

/** Records the job and builds the file in the background; answers the in-progress row. */
export async function startExport(request: ExportRequest, requestedBy: string): Promise<ExportJob> {
  const dataset = DATASETS[request.dataset];
  const from = dataset.ranged ? request.from : null;
  const to = dataset.ranged ? request.to : null;
  const inserted = await pool.query(
    `
      INSERT INTO export_jobs (dataset, format, range_from, range_to, requested_by_name)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING ${JOB_COLUMNS}
    `,
    [request.dataset, request.format, from, to, requestedBy],
  );
  const job: ExportJob = inserted.rows[0];

  void (async () => {
    try {
      const result = await pool.query(dataset.sql, dataset.ranged ? [from, to] : []);
      const body =
        request.format === "csv"
          ? toCsv(dataset.columns, result.rows)
          : JSON.stringify(
              { dataset: request.dataset, from, to, exported_at: new Date().toISOString(), rows: result.rows },
              null,
              2,
            );
      const stamp = new Date().toISOString().slice(0, 10);
      const range = from || to ? `-${from ?? "start"}-to-${to ?? "today"}` : "";
      const fileName = `${request.dataset}${range}-${stamp}-${job.id}.${request.format}`;
      const key = await storePrivateObject(
        "exports",
        fileName,
        body,
        request.format === "csv" ? "text/csv; charset=utf-8" : "application/json",
      );
      await pool.query(
        `
          UPDATE export_jobs SET status = 'completed', s3_key = $2, row_count = $3, size_bytes = $4, finished_at = now()
          WHERE export_id = $1
        `,
        [job.id, key, result.rows.length, Buffer.byteLength(body)],
      );
    } catch (error: any) {
      console.error(`Export #${job.id} failed:`, error);
      await pool
        .query(`UPDATE export_jobs SET status = 'failed', error = $2, finished_at = now() WHERE export_id = $1`, [
          job.id,
          String(error?.message ?? error).slice(0, 500),
        ])
        .catch((e) => console.error("Recording the failed export failed:", e));
    }
  })();
  return job;
}

export async function listExports(): Promise<ExportJob[]> {
  const result = await pool.query(`SELECT ${JOB_COLUMNS} FROM export_jobs ORDER BY requested_at DESC LIMIT 100`);
  return result.rows;
}

export async function getExport(export_id: number): Promise<(ExportJob & { s3_key: string | null }) | undefined> {
  const result = await pool.query(`SELECT ${JOB_COLUMNS}, s3_key FROM export_jobs WHERE export_id = $1`, [export_id]);
  return result.rows[0];
}

/** The file name a download is offered under. */
export const exportFileName = (job: ExportJob) =>
  `bullscoffee-${job.dataset}${job.range_from || job.range_to ? `-${job.range_from ?? "start"}-to-${job.range_to ?? "today"}` : ""}.${job.format}`;

// Exports go after 7 days, file and row, which is what the page promises.
// Interrupted ones (still in progress after an hour) are marked failed.
async function pruneExports(): Promise<void> {
  await pool.query(`
    UPDATE export_jobs SET status = 'failed', error = 'Interrupted (the server restarted)', finished_at = now()
    WHERE status = 'in_progress' AND requested_at < now() - interval '1 hour'
  `);
  const old = await pool.query(
    `SELECT export_id, s3_key FROM export_jobs WHERE requested_at < now() - make_interval(days => $1)`,
    [KEEP_DAYS],
  );
  for (const { export_id, s3_key } of old.rows) {
    if (s3_key && isS3Configured()) await deleteFile(s3_key);
    await pool.query(`DELETE FROM export_jobs WHERE export_id = $1`, [export_id]);
  }
}

export function registerExportJobs(): void {
  registerJob({ name: "prune exports", everyTicks: 60, run: pruneExports });
}
