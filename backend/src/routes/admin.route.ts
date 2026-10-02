import { Router } from "express";
import {
  getActivityHandler,
  getActivityModulesHandler,
  getSignInStatsHandler,
  reviewActivityHandler,
} from "../controllers/activity.controller.ts";
import { protectRoute, requireAdmin } from "../middleware/auth.middleware.ts";

// Mounted at /api/admin. Every route below is for active admins only: the
// guard runs once here, so no admin route can be added without it.
const router = Router();

router.use(protectRoute, requireAdmin);

/*
    ACTIVITY LOG & AUDIT TRAIL
*/
router.get("/activity", getActivityHandler);
router.get("/activity/modules", getActivityModulesHandler);
router.get("/activity/stats/sign-ins", getSignInStatsHandler);
router.patch("/activity/:id/review", reviewActivityHandler);

export default router;
