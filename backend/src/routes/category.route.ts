import {
  getCategoriesHandler,
  getCategoryByIdHandler,
  createCategoryHandler,
  updateCategoryHandler,
  deleteCategoryHandler,
} from "../controllers/category.controller.ts";
import { Router } from "express";
import { protectRoute, requireManager } from "../middleware/auth.middleware.ts";
import { uploadSingle, uploadToS3 } from "../middleware/upload.middleware.ts";

const router = Router();

/*
    CRUD CATEGORIES
*/
// Reads stay public so the storefront and kiosk can show the menu.
router.get("/categories", getCategoriesHandler);
router.get("/categories/:id", getCategoryByIdHandler);
router.post("/categories", protectRoute, requireManager, uploadSingle("image"), uploadToS3, createCategoryHandler);
router.put("/categories/:id", protectRoute, requireManager, uploadSingle("image"), uploadToS3, updateCategoryHandler);
router.delete("/categories/:id", protectRoute, requireManager, deleteCategoryHandler);

export default router;
