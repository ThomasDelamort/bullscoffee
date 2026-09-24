import "dotenv/config";
import express from "express";
import cors from "cors";
import type { Request, Response } from "express";
import { runInitSql } from "./schema/init.ts";
import responseFormatter from "./middleware/responseFormatter.ts";
import { StatusCodes } from "http-status-codes";

// Import Routes
import employeeRoutes from "./routes/employee.route.ts";
import customerRoutes from "./routes/customer.route.ts";
import supplierRoutes from "./routes/supplier.route.ts"


const app = express();
const PORT = process.env["PORT"] || 3000;

app.use(cors());
app.use(express.json());
app.use(responseFormatter);

app.get("/", (_req: Request, res: Response) => {
  return res.status(StatusCodes.OK).json({  message: "Welcome to Bull's Coffee", data: `Server running at http://localhost:${PORT}`,});
});

app.get("/health-check", (_req: Request, res: Response) => {
  return res.status(StatusCodes.OK).json({ message: "Server health check positive", data: `Sever running at http://localhost:${PORT}` });
});

// Routes
app.use("/api", employeeRoutes);
app.use("/api", customerRoutes);
app.use("/api", supplierRoutes);

async function startServer() {
  try {
    await runInitSql();
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  } catch (err: any) {
    console.error("Failed to start server:", err);
    process.exit(1);
  }
}

startServer();
