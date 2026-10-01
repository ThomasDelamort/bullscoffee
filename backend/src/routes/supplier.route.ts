import {
  getSuppliersHandler,
  getSupplierByIdHandler,
  createSupplierHandler,
  updateSupplierHandler,
  getSupplierIngredientsHandler,
  replaceSupplierIngredientsHandler,
} from "../controllers/supplier.controller.ts";

import { Router } from "express";
import { protectRoute, requireManager } from "../middleware/auth.middleware.ts";
import { uploadSingle, uploadToS3 } from "../middleware/upload.middleware.ts";

const router = Router();
/*
    SUPPLIER ROUTES
*/

router.get("/suppliers", protectRoute, requireManager, getSuppliersHandler);
router.get("/suppliers/:id", protectRoute, requireManager, getSupplierByIdHandler);
router.post("/suppliers", protectRoute, requireManager, uploadSingle("image"), uploadToS3, createSupplierHandler);
router.put("/suppliers/:id", protectRoute, requireManager, uploadSingle("image"), uploadToS3, updateSupplierHandler);
router.get("/suppliers/:id/ingredients", protectRoute, requireManager, getSupplierIngredientsHandler);
router.put("/suppliers/:id/ingredients", protectRoute, requireManager, replaceSupplierIngredientsHandler);

export default router;
