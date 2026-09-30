import type { PoolClient } from "pg";
import { pool } from "./db.ts";

/** Anything that can run a query: the pool, or a client inside a transaction. */
export type Queryable = Pick<PoolClient, "query">;

// Runs `work` inside BEGIN / COMMIT, rolling back (and rethrowing) on error.
export async function withTransaction<T>(
  work: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await work(client);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

// Partial UPDATE for PATCH routes. Only keys in `columns` are written (the
// whitelist is what keeps request-body keys out of the SQL), `undefined` means
// "leave alone" and `null` means "set NULL" (e.g. removing an image).
export async function updateRow<T>(
  table: string,
  idColumn: string,
  id: number,
  columns: readonly string[],
  changes: object,
): Promise<T | undefined> {
  const source = changes as Record<string, unknown>;
  const entries = columns
    .filter((column) => source[column] !== undefined)
    .map((column) => [column, source[column]] as const);

  if (entries.length === 0) {
    const current = await pool.query(
      `SELECT * FROM ${table} WHERE ${idColumn} = $1`,
      [id],
    );
    return current.rows[0];
  }

  const assignments = entries
    .map(([column], index) => `${column} = $${index + 1}`)
    .join(", ");
  const values = [...entries.map(([, value]) => value), id];
  const result = await pool.query(
    `UPDATE ${table} SET ${assignments} WHERE ${idColumn} = $${values.length} RETURNING *`,
    values,
  );
  return result.rows[0];
}
