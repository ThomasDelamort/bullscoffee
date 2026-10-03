import { getSalesReportHandler, exportSalesReportHandler } from "../controllers/report.controller.ts";
import { Router } from "express";
import { protectRoute, requirePermission } from "../middleware/auth.middleware.ts";

const router = Router();
/*
    REPORT ROUTES
*/

router.get("/reports/sales", protectRoute, requirePermission("reports.view"), getSalesReportHandler);
router.get("/reports/sales/export", protectRoute, requirePermission("reports.export"), exportSalesReportHandler);

export default router;
