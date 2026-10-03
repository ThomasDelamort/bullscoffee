import {
  getDocumentsHandler,
  createDocumentHandler,
  downloadDocumentHandler,
  deleteDocumentHandler,
} from "../controllers/document.controller.ts";
import { Router } from "express";
import { protectRoute, requirePermission } from "../middleware/auth.middleware.ts";
import { uploadFile } from "../middleware/upload.middleware.ts";

const router = Router();
const canManage = requirePermission("documents.manage");

/*
    LOGS - CSVs in S3 under bulls-coffee/logs/. They are private: S3 won't
    serve them to anyone, so these routes are the only way to see them.
*/
router.get("/logs", protectRoute, canManage, getDocumentsHandler("log"));
router.post("/logs", protectRoute, canManage, uploadFile("log", "file"), createDocumentHandler("log"));
router.get("/logs/:id/download", protectRoute, canManage, downloadDocumentHandler("log"));

/*
    PDFS - public files in S3 under bulls-coffee/pdfs/; each row's file_url
    opens the PDF directly.
*/
router.get("/pdfs", protectRoute, canManage, getDocumentsHandler("pdf"));
router.post("/pdfs", protectRoute, canManage, uploadFile("pdf", "file"), createDocumentHandler("pdf"));
router.delete("/pdfs/:id", protectRoute, canManage, deleteDocumentHandler("pdf"));

export default router;
