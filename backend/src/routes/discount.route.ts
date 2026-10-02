import { Router } from "express";
import {
  createDiscountHandler,
  deleteDiscountHandler,
  getDiscountsHandler,
  updateDiscountHandler,
} from "../controllers/discount.controller.ts";
import {
  protectRoute,
  requireEmployee,
  requireManager,
} from "../middleware/auth.middleware.ts";

const router = Router();

// Every register reads the list; only managers change it.
router.get("/discounts", protectRoute, requireEmployee, getDiscountsHandler);
router.post("/discounts", protectRoute, requireManager, createDiscountHandler);
router.patch("/discounts/:id", protectRoute, requireManager, updateDiscountHandler);
router.delete("/discounts/:id", protectRoute, requireManager, deleteDiscountHandler);

export default router;
