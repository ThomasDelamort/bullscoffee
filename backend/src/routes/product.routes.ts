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
import { protectRoute, requireManager } from "../middleware/auth.middleware.ts";
import { uploadSingle, uploadToS3 } from "../middleware/upload.middleware.ts";

const router = Router();

// Reads stay public so the storefront and kiosk can show the menu.
router.get("/products", getProductsHandler);
router.get("/products/:id", getProductByIdHandler);
router.post("/products", protectRoute, requireManager, uploadSingle("image"), uploadToS3, createProductHandler);
router.put("/products/:id", protectRoute, requireManager, uploadSingle("image"), uploadToS3, updateProductHandler);
router.delete("/products/:id", protectRoute, requireManager, deleteProductHandler);
router.get("/products/:id/ingredients", protectRoute, requireManager, getProductIngredientsHandler);
router.put("/products/:id/ingredients", protectRoute, requireManager, replaceProductIngredientsHandler);

export default router;
