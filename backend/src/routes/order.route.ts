import { getOrdersHandler, getOrderByIdHandler, createOrderHandler, completeOrderHandler, cancelOrderHandler } from "../controllers/order.controller.ts";
import { Router } from "express";

const router = Router();

router.get("/orders", getOrdersHandler);
router.get("/orders/:id", getOrderByIdHandler);
router.post("/orders", createOrderHandler);
router.patch("/orders/:id/complete", completeOrderHandler);
router.patch("/orders/:id/cancel", cancelOrderHandler);

export default router;