import "dotenv/config";
import express from "express";
import cors from "cors";
import type { Request, Response } from "express";
import { runInitSql } from "./schema/init.ts";

// Import Routes
import employeeRoutes from "./routes/employee.route.ts";
import customerRoutes from "./routes/customer.route.ts";
import supplierRoutes from "./routes/supplier.route.ts"

const app = express();
const PORT = process.env["PORT"] || 3000;

app.use(cors());
app.use(express.json());

app.get("/", (_req: Request, res: Response) => {
  return res.status(200).json({ server: "Welcome to Bull's Coffee!" });
});

app.get("/health-check", (_req: Request, res: Response) => {
  return res.status(200).json({ server: "Server is running!" });
});

// Routes
app.use("/api", employeeRoutes);
app.use("/api", customerRoutes);
app.use("/api", supplierRoutes);

async function startServer() {
  try {
    await runInitSql();
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  } catch (err) {
    console.error("Failed to start server:", err);
    process.exit(1);
  }
}

startServer();
