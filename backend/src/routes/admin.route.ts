import {
  createCustomerHandler,
  deleteCustomerHandler,
  getAllCustomersHandler,
  getCustomerByIdHandler,
} from "../controllers/admin.controller.ts";
import {
  createEmployeeHandler,
  getAllEmployeesHandler,
  getEmployeeByIdHandler,
  deleteEmployeeHandler,
} from "../controllers/admin.controller.ts";
import { Router } from "express";
import { protectRoute } from "../middleware/auth.middleware.ts";

const router = Router();

/* 
    CUSTOMER ROUTES
*/
router.post("/customers", protectRoute, createCustomerHandler);
router.get("/customers", getAllCustomersHandler);
router.get("/customers/:id", getCustomerByIdHandler);
router.delete("/customers/:id", deleteCustomerHandler);

/* 
    EMPLOYEE ROUTES
*/
router.post("/employees", protectRoute, createEmployeeHandler);
router.get("/employees", getAllEmployeesHandler);
router.get("/employees/:id", getEmployeeByIdHandler);
router.delete("/employees/:id", deleteEmployeeHandler);

export default router;
