import { getDeliveriesHandler, getDeliveryByIdHandler, createDeliveryHandler } from "../controllers/delivery.controller.ts";
import { Router } from "express";

const router = Router();

router.get("/deliveries", getDeliveriesHandler);
router.get("/deliveries/:id", getDeliveryByIdHandler);
router.post("/deliveries", createDeliveryHandler);

export default router;