import { Router } from "express";
import { protectRoute, requireAdmin } from "../middleware/auth.middleware.ts";

// Mounted at /api/admin. Every route below is for active admins only: the
// guard runs once here, so no admin route can be added without it.
const router = Router();

router.use(protectRoute, requireAdmin);

export default router;
