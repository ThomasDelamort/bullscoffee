import { Router } from "express";
import {
  getProductByIdHandler,
  getProductsHandler,
} from "../controllers/products.controller.ts";

const router = Router();

router.get("/products", getProductsHandler);
router.get("/products/:id", getProductByIdHandler);

export default router;
