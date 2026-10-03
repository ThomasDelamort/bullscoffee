import "dotenv/config";
import express from "express";
import cors from "cors";
import { clerkMiddleware } from "@clerk/express";
import type { Request, Response } from "express";
import { runInitSql } from "./lib/init.ts";
import { checkBackupCoverage, registerBackupJobs } from "./lib/backup.ts";
import { registerHealthJobs } from "./lib/health.ts";
import { startScheduler } from "./lib/scheduler.ts";
import { requestMetrics } from "./middleware/requestMetrics.middleware.ts";
import responseFormatter from "./middleware/responseFormatter.ts";
import { StatusCodes } from "http-status-codes";

// Import Routes
import adminRoutes from "./routes/admin.route.ts";
import customerRoutes from "./routes/customer.route.ts";
import employeeRoutes from "./routes/employee.routes.ts";
import managerRoutes from "./routes/manager.route.ts";
import reportRoutes from "./routes/report.route.ts";
import productRoutes from "./routes/product.routes.ts";
import categoryRoutes from "./routes/category.route.ts";
import ingredientRoutes from "./routes/ingredients.route.ts";
import supplierRoutes from "./routes/supplier.route.ts";
import deliveryRoutes from "./routes/delivery.route.ts";
import orderRoutes from "./routes/order.route.ts";
import stockMovementsRoute from "./routes/stock-movement.route.ts";
import attendanceRoutes from "./routes/attendance.route.ts";
import documentRoutes from "./routes/document.route.ts";
import kioskRoutes from "./routes/kiosk.route.ts";
import discountRoutes from "./routes/discount.route.ts";
import paymentRoutes from "./routes/payment.route.ts";
import settingsRoutes from "./routes/settings.route.ts";
import supportRoutes from "./routes/support.route.ts";
import { paymongoWebhookHandler } from "./controllers/payment.controller.ts";

const app = express();
const PORT = process.env["PORT"] || 3000;

// Render puts one proxy in front of the app. Trusting it makes req.ip the
// client's address (from X-Forwarded-For) instead of the proxy's, for the
// activity log and the per-IP rate limits.
app.set("trust proxy", 1);

app.use(cors());
// PayMongo signs the exact bytes it sends, so its webhook takes the raw body
// and has to be registered before express.json() parses it away.
app.post(
  "/api/payments/webhook",
  express.raw({ type: "application/json" }),
  paymongoWebhookHandler,
);
app.use(express.json());
app.use(clerkMiddleware());
// Counts every API response for System Health; after clerkMiddleware so it
// can tell who is signed in.
app.use(requestMetrics);
app.use(responseFormatter);

app.get("/", (_req: Request, res: Response) => {
  return res.status(StatusCodes.OK).json({
    message: "Welcome to Bull's Coffee",
    data: `Server running at http://localhost:${PORT}`,
  });
});

app.get("/health-check", (_req: Request, res: Response) => {
  return res.status(StatusCodes.OK).json({
    message: "Server health check positive",
    data: `Sever running at http://localhost:${PORT}`,
  });
});

// Routes
app.use("/api/admin", adminRoutes);
app.use("/api", customerRoutes);
app.use("/api", employeeRoutes);
app.use("/api", managerRoutes);
app.use("/api", reportRoutes);

app.use("/api", productRoutes);
app.use("/api", categoryRoutes);
app.use("/api", ingredientRoutes);
app.use("/api", supplierRoutes);
app.use("/api", deliveryRoutes);
app.use("/api", orderRoutes);
app.use("/api", stockMovementsRoute);
app.use("/api", attendanceRoutes);
app.use("/api", documentRoutes);
app.use("/api", kioskRoutes);
app.use("/api", discountRoutes);
app.use("/api", paymentRoutes);
app.use("/api", settingsRoutes);
app.use("/api", supportRoutes);

async function startServer() {
  try {
    await runInitSql();
    await checkBackupCoverage();
    registerHealthJobs();
    registerBackupJobs();
    startScheduler();
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  } catch (err: any) {
    console.error("Failed to start server:", err);
    process.exit(1);
  }
}

startServer();
