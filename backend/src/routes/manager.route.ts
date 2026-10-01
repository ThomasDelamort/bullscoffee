import { getCurrentEmployeeHandler } from "../controllers/manager.controller.ts";
import { Router } from "express";

const router = Router();

/*
    MANAGER ROUTES
*/

router.get("/manager/me", getCurrentEmployeeHandler);

export default router;