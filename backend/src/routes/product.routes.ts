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
import { protectRoute, requirePermission } from "../middleware/auth.middleware.ts";
import { uploadFile } from "../middleware/upload.middleware.ts";

const router = Router();

// Reads stay public so the storefront and kiosk can show the menu.
router.get("/products", getProductsHandler);
router.get("/products/:id", getProductByIdHandler);
router.post("/products", protectRoute, requirePermission("menu.manage"), uploadFile("product"), createProductHandler);
router.put("/products/:id", protectRoute, requirePermission("menu.manage"), uploadFile("product"), updateProductHandler);
router.delete("/products/:id", protectRoute, requirePermission("menu.manage"), deleteProductHandler);
router.get("/products/:id/ingredients", protectRoute, requirePermission("menu.manage"), getProductIngredientsHandler);
router.put("/products/:id/ingredients", protectRoute, requirePermission("menu.manage"), replaceProductIngredientsHandler);

export default router;
