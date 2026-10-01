import { getAttendanceHandler, setAttendanceTimeOutHandler } from "../controllers/attendance.controller.ts";
import { Router } from "express";
import { protectRoute, requireEmployee, requireManager } from "../middleware/auth.middleware.ts";

const router = Router();

router.get("/attendance", protectRoute, requireManager, getAttendanceHandler);
router.patch("/attendance/:id/time-out", protectRoute, requireEmployee, setAttendanceTimeOutHandler);

export default router;
