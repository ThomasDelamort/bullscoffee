import {
  getCategoriesHandler,
  getCategoryByIdHandler,
  createCategoryHandler,
  updateCategoryHandler,
  deleteCategoryHandler,
} from "../controllers/category.controller.ts";
import { Router } from "express";

const router = Router();

/*
    CRUD CATEGORIES
*/
router.get("/categories", getCategoriesHandler);
router.get("/categories/:id", getCategoryByIdHandler);
router.post("/categories", createCategoryHandler);
router.put("/categories/:id", updateCategoryHandler);
router.delete("/categories/:id", deleteCategoryHandler);

export default router;
