import {
  getIngredientsHandler,
  getIngredientByIdHandler,
  createIngredientHandler,
  updateIngredientHandler,
} from "../controllers/ingredient.controller.ts";
import { Router } from "express";

const router = Router();

/* 
    INGREDIENTS ROUTES
*/

router.get("/ingredients", getIngredientsHandler);
router.get("/ingredients/:id", getIngredientByIdHandler);
router.post("/ingredients", createIngredientHandler);
router.put("/ingredients/:id", updateIngredientHandler);

export default router;
