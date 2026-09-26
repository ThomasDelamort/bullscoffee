import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { pool } from "./db.ts"; // matches your import above, adjust if needed

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
}
