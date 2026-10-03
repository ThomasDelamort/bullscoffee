import {
  getCategoriesHandler,
  getCategoryByIdHandler,
  createCategoryHandler,
  updateCategoryHandler,
  deleteCategoryHandler,
} from "../controllers/category.controller.ts";
import { Router } from "express";
import { protectRoute, requirePermission } from "../middleware/auth.middleware.ts";
import { uploadFile } from "../middleware/upload.middleware.ts";

const router = Router();

/*
    CRUD CATEGORIES
*/
// Reads stay public so the storefront and kiosk can show the menu.
router.get("/categories", getCategoriesHandler);
router.get("/categories/:id", getCategoryByIdHandler);
router.post("/categories", protectRoute, requirePermission("menu.manage"), uploadFile("category"), createCategoryHandler);
router.put("/categories/:id", protectRoute, requirePermission("menu.manage"), uploadFile("category"), updateCategoryHandler);
router.delete("/categories/:id", protectRoute, requirePermission("menu.manage"), deleteCategoryHandler);

export default router;
