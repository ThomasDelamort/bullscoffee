import {
  getSuppliersHandler,
  getSupplierByIdHandler,
  createSupplierHandler,
  updateSupplierHandler,
  getSupplierIngredientsHandler,
  replaceSupplierIngredientsHandler,
} from "../controllers/supplier.controller.ts";

import { Router } from "express";

const router = Router();
/*
    SUPPLIER ROUTES
*/

router.get("/suppliers", getSuppliersHandler);
router.get("/suppliers/:id", getSupplierByIdHandler);
router.post("/suppliers", createSupplierHandler);
router.put("/suppliers/:id", updateSupplierHandler);
router.get("/suppliers/:id/ingredients", getSupplierIngredientsHandler);
router.put("/suppliers/:id/ingredients", replaceSupplierIngredientsHandler);

export default router;
