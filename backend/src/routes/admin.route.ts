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
router.get("/customers", protectRoute, getAllCustomersHandler);
router.get("/customers/:id", protectRoute, getCustomerByIdHandler);
router.delete("/customers/:id", protectRoute, deleteCustomerHandler);

/* 
    EMPLOYEE ROUTES
*/
router.post("/employees", protectRoute, createEmployeeHandler);
router.get("/employees", protectRoute, getAllEmployeesHandler);
router.get("/employees/:id", protectRoute, getEmployeeByIdHandler);
router.delete("/employees/:id", protectRoute, deleteEmployeeHandler);

export default router;
