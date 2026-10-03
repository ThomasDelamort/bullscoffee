import {
  getSuppliersHandler,
  getSupplierByIdHandler,
  createSupplierHandler,
  updateSupplierHandler,
  getSupplierIngredientsHandler,
  replaceSupplierIngredientsHandler,
} from "../controllers/supplier.controller.ts";

import { Router } from "express";
import { protectRoute, requirePermission } from "../middleware/auth.middleware.ts";
import { uploadFile } from "../middleware/upload.middleware.ts";

const router = Router();
const canManage = requirePermission("suppliers.manage");
/*
    SUPPLIER ROUTES
*/

router.get("/suppliers", protectRoute, canManage, getSuppliersHandler);
router.get("/suppliers/:id", protectRoute, canManage, getSupplierByIdHandler);
router.post("/suppliers", protectRoute, canManage, uploadFile("supplier"), createSupplierHandler);
router.put("/suppliers/:id", protectRoute, canManage, uploadFile("supplier"), updateSupplierHandler);
router.get("/suppliers/:id/ingredients", protectRoute, canManage, getSupplierIngredientsHandler);
router.put("/suppliers/:id/ingredients", protectRoute, canManage, replaceSupplierIngredientsHandler);

export default router;
