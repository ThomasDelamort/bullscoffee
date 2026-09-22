import { createSupplierHandler, getAllSuppliersHandler, getSupplierByIdHandler, deleteSupplierByIdHandler } from "../controllers/supplier.controller.ts";
import { Router } from "express";

const router = Router();

router.post("/suppliers", createSupplierHandler);
router.get("/suppliers", getAllSuppliersHandler);
router.get("/suppliers/:id", getSupplierByIdHandler);
router.delete("/suppliers/:id", deleteSupplierByIdHandler);

export default router;