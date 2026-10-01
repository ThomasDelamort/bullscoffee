import {
  getIngredientsHandler,
  getIngredientByIdHandler,
  createIngredientHandler,
  updateIngredientHandler,
} from "../controllers/ingredient.controller.ts";
import { Router } from "express";
import { protectRoute, requireManager } from "../middleware/auth.middleware.ts";
import { uploadSingle, uploadToS3 } from "../middleware/upload.middleware.ts";

const router = Router();

/*
    INGREDIENTS ROUTES
*/

router.get("/ingredients", protectRoute, getIngredientsHandler);
router.get("/ingredients/:id", protectRoute, getIngredientByIdHandler);
router.post("/ingredients", protectRoute, requireManager, uploadSingle("image"), uploadToS3, createIngredientHandler);
router.put("/ingredients/:id", protectRoute, requireManager, uploadSingle("image"), uploadToS3, updateIngredientHandler);

export default router;
