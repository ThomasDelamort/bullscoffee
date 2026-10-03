import { getOrdersHandler, getOrderByIdHandler, createOrderHandler, completeOrderHandler, cancelOrderHandler, payOrderHandler } from "../controllers/order.controller.ts";
import { Router } from "express";
import { protectRoute, requirePermission } from "../middleware/auth.middleware.ts";

const router = Router();

router.get("/orders", protectRoute, requirePermission("orders.view"), getOrdersHandler);
router.get("/orders/:id", protectRoute, requirePermission("orders.view"), getOrderByIdHandler);
router.post("/orders", protectRoute, requirePermission("orders.process"), createOrderHandler);
router.post("/orders/:id/payments", protectRoute, requirePermission("orders.process"), payOrderHandler);
router.patch("/orders/:id/complete", protectRoute, requirePermission("orders.process"), completeOrderHandler);
router.patch("/orders/:id/cancel", protectRoute, requirePermission("orders.cancel"), cancelOrderHandler);

export default router;
