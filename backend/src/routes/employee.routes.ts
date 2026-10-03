import {
  getEmployeesHandler,
  getEmployeeByIdHandler,
  createEmployeeHandler,
  updateEmployeeHandler,
} from "../controllers/employee.controller.ts";
import { Router } from "express";
import { protectRoute, requirePermission } from "../middleware/auth.middleware.ts";
import { uploadFile } from "../middleware/upload.middleware.ts";

const router = Router();
const canManage = requirePermission("staff.manage");

router.get("/employees", protectRoute, canManage, getEmployeesHandler);
router.get("/employees/:id", protectRoute, canManage, getEmployeeByIdHandler);
router.post("/employees", protectRoute, canManage, createEmployeeHandler);
router.put(
  "/employees/:id",
  protectRoute,
  canManage,
  uploadFile("employee"),
  updateEmployeeHandler,
);

export default router;
