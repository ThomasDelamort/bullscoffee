import { getSalesReportHandler, exportSalesReportHandler } from "../controllers/report.controller.ts";
import { Router } from "express";
import { protectRoute, requireManager } from "../middleware/auth.middleware.ts";

const router = Router();
/*
    REPORT ROUTES
*/

router.get("/reports/sales", protectRoute, requireManager, getSalesReportHandler);
router.get("/reports/sales/export", protectRoute, requireManager, exportSalesReportHandler);

export default router;
