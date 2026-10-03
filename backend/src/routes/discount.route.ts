import { Router } from "express";
import {
  createDiscountHandler,
  deleteDiscountHandler,
  getDiscountsHandler,
  updateDiscountHandler,
} from "../controllers/discount.controller.ts";
import { protectRoute, requirePermission } from "../middleware/auth.middleware.ts";

const router = Router();

// Every register reads the list to apply one; changing it is separate.
router.get("/discounts", protectRoute, requirePermission("orders.process"), getDiscountsHandler);
router.post("/discounts", protectRoute, requirePermission("discounts.manage"), createDiscountHandler);
router.patch("/discounts/:id", protectRoute, requirePermission("discounts.manage"), updateDiscountHandler);
router.delete("/discounts/:id", protectRoute, requirePermission("discounts.manage"), deleteDiscountHandler);

export default router;
