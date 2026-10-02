import { Pool } from "pg";

export const pool = new Pool({
  connectionString: process.env["DATABASE_URL"],
  // Neon requires SSL; localhost doesn't. Enable SSL if the connection
  // string contains "neon.tech" or if PGSSL is explicitly true.
  ssl:
    process.env["DATABASE_URL"]?.includes("neon.tech") ||
    process.env["PGSSL"] === "true"
      ? { rejectUnauthorized: false }
      : false,
});
