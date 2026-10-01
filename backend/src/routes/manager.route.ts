import { getCurrentEmployeeHandler } from "../controllers/manager.controller.ts";
import { Router } from "express";
import { protectRoute } from "../middleware/auth.middleware.ts";

const router = Router();

/*
    MANAGER ROUTES
*/

router.get("/manager/me", protectRoute, getCurrentEmployeeHandler);

export default router;
