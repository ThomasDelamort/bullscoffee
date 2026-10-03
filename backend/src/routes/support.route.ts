import { Router } from "express";
import { createTicketHandler } from "../controllers/support.controller.ts";
import { ticketLimiter } from "../middleware/rateLimit.middleware.ts";

const router = Router();

// Public: the storefront's Contact form, signed in or not. Handling tickets
// is under /api/admin/tickets.
router.post("/support/tickets", ticketLimiter, createTicketHandler);

export default router;
