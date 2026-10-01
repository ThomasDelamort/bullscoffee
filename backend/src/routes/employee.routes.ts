import {
  getEmployeesHandler,
  getEmployeeByIdHandler,
  createEmployeeHandler,
  updateEmployeeHandler,
} from "../controllers/employee.controller.ts";
import { Router } from "express";
import { protectRoute, requireManager } from "../middleware/auth.middleware.ts";

const router = Router();

router.get("/employees", protectRoute, requireManager, getEmployeesHandler);
router.get(
  "/employees/:id",
  protectRoute,
  requireManager,
  getEmployeeByIdHandler,
);
// router.post("/employees", protectRoute, requireManager, createEmployeeHandler);
router.post("/employees", createEmployeeHandler);
router.put(
  "/employees/:id",
  protectRoute,
  requireManager,
  updateEmployeeHandler,
);

export default router;
