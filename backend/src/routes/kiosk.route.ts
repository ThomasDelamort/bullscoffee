import { Router } from "express";
import { createKioskOrderHandler } from "../controllers/kiosk.controller.ts";
import { kioskOrderLimiter } from "../middleware/rateLimit.middleware.ts";

const router = Router();

// Public: guests order at the kiosk without signing in, so it's rate limited
// instead. When a signed-in customer's session comes along, the order is
// linked to them.
router.post("/kiosk/orders", kioskOrderLimiter, createKioskOrderHandler);

export default router;
