import { Router } from "express";
import {
  getProductByIdHandler,
  getProductsHandler,
  createProductHandler,
  updateProductHandler,
  deleteProductHandler,
  getProductIngredientsHandler,
  replaceProductIngredientsHandler
} from "../controllers/products.controller.ts";

const router = Router();

router.get("/products", getProductsHandler);
router.get("/products/:id", getProductByIdHandler);
router.post("/products", createProductHandler);
router.put("/products/:id", updateProductHandler);
router.delete("/products/:id", deleteProductHandler);
router.get("/products/:id/ingredients", getProductIngredientsHandler);
router.put("/products/:id/ingredients", replaceProductIngredientsHandler);

export default router;
