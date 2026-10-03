import { getDeliveriesHandler, getDeliveryByIdHandler, createDeliveryHandler } from "../controllers/delivery.controller.ts";
import { Router } from "express";
import { protectRoute, requirePermission } from "../middleware/auth.middleware.ts";

const router = Router();
const canManage = requirePermission("suppliers.manage");

router.get("/deliveries", protectRoute, canManage, getDeliveriesHandler);
router.get("/deliveries/:id", protectRoute, canManage, getDeliveryByIdHandler);
router.post("/deliveries", protectRoute, canManage, createDeliveryHandler);

export default router;
