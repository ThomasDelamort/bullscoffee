import { getEmployeesHandler, getEmployeeByIdHandler, createEmployeeHandler, updateEmployeeHandler } from "../controllers/employee.controller.ts";
import { Router } from "express";

const router = Router();

router.get("/employees", getEmployeesHandler);
router.get("/employees/:id", getEmployeeByIdHandler);
router.post("/employees", createEmployeeHandler);
router.put("/employees/:id", updateEmployeeHandler);

export default router;