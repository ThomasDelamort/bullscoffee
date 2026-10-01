import { getAttendanceHandler, setAttendanceTimeOutHandler } from "../controllers/attendance.controller.ts";
import { Router } from "express";

const router = Router();

router.get("/attendance", getAttendanceHandler);
router.patch("/attendace/:id/time-out", setAttendanceTimeOutHandler);

export default router;