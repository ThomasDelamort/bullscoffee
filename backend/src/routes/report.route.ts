import { getSalesReportHandler, exportSalesReportHandler } from "../controllers/report.controller.ts";
import { Router } from "express";

const router = Router();
/*
    REPORT ROUTES
*/

router.get("/report/sales", getSalesReportHandler);
router.get("/reports/sales/export", exportSalesReportHandler);;
export default router;