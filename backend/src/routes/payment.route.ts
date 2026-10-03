import { Router } from "express";
import {
  createCheckoutSessionHandler,
  getGatewayHandler,
  getOrderPaymentStatusHandler,
  getPaymentOptionsHandler,
  testGatewayHandler,
  updateGatewayHandler,
} from "../controllers/payment.controller.ts";
import { protectRoute, requireAdmin, requirePermission } from "../middleware/auth.middleware.ts";
import { paymentStatusLimiter } from "../middleware/rateLimit.middleware.ts";

// The PayMongo webhook isn't here: it needs the raw request body, so it's
// registered in server.ts ahead of express.json().
const router = Router();

// Public: the kiosk asks whether to offer online payment, and the checkout
// return page polls whether an order's payment has come through.
router.get("/payments/options", getPaymentOptionsHandler);
router.get("/payments/orders/:id/status", paymentStatusLimiter, getOrderPaymentStatusHandler);

router.post("/payments/checkout-session", protectRoute, requirePermission("orders.process"), createCheckoutSessionHandler);

router.get("/payments/gateway", protectRoute, requireAdmin, getGatewayHandler);
router.put("/payments/gateway", protectRoute, requireAdmin, updateGatewayHandler);
router.post("/payments/gateway/test", protectRoute, requireAdmin, testGatewayHandler);

export default router;
