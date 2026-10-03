import {
  getIngredientsHandler,
  getIngredientByIdHandler,
  createIngredientHandler,
  updateIngredientHandler,
} from "../controllers/ingredient.controller.ts";
import { Router } from "express";
import { protectRoute, requirePermission } from "../middleware/auth.middleware.ts";
import { uploadFile } from "../middleware/upload.middleware.ts";

const router = Router();

/*
    INGREDIENTS ROUTES
*/

router.get("/ingredients", protectRoute, requirePermission("inventory.view"), getIngredientsHandler);
router.get("/ingredients/:id", protectRoute, requirePermission("inventory.view"), getIngredientByIdHandler);
router.post("/ingredients", protectRoute, requirePermission("inventory.manage"), uploadFile("ingredient"), createIngredientHandler);
router.put("/ingredients/:id", protectRoute, requirePermission("inventory.manage"), uploadFile("ingredient"), updateIngredientHandler);

export default router;
