import { getDeliveriesHandler, getDeliveryByIdHandler, createDeliveryHandler } from "../controllers/delivery.controller.ts";
import { Router } from "express";
import { protectRoute, requireManager } from "../middleware/auth.middleware.ts";

const router = Router();

router.get("/deliveries", protectRoute, requireManager, getDeliveriesHandler);
router.get("/deliveries/:id", protectRoute, requireManager, getDeliveryByIdHandler);
router.post("/deliveries", protectRoute, requireManager, createDeliveryHandler);

export default router;
