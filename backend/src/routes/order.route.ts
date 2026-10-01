import { getOrdersHandler, getOrderByIdHandler, createOrderHandler, completeOrderHandler, cancelOrderHandler } from "../controllers/order.controller.ts";
import { Router } from "express";
import { protectRoute, requireEmployee } from "../middleware/auth.middleware.ts";

const router = Router();

router.get("/orders", protectRoute, requireEmployee, getOrdersHandler);
router.get("/orders/:id", protectRoute, requireEmployee, getOrderByIdHandler);
router.post("/orders", protectRoute, requireEmployee, createOrderHandler);
router.patch("/orders/:id/complete", protectRoute, requireEmployee, completeOrderHandler);
router.patch("/orders/:id/cancel", protectRoute, requireEmployee, cancelOrderHandler);

export default router;
