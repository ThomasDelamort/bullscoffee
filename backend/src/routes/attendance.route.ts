import { getAttendanceHandler, setAttendanceTimeOutHandler } from "../controllers/attendance.controller.ts";
import { Router } from "express";
import { protectRoute, requireEmployee, requirePermission } from "../middleware/auth.middleware.ts";

const router = Router();

router.get("/attendance", protectRoute, requirePermission("staff.attendance"), getAttendanceHandler);
// Self-service: any active member of staff.
router.patch("/attendance/:id/time-out", protectRoute, requireEmployee, setAttendanceTimeOutHandler);

export default router;
