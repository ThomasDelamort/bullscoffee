import {
  createCustomerHandler,
  deleteCustomerHandler,
  getCustomerByIdHandler,
  getAllCustomersHandler,
  updateCustomerProfileHandler,
  searchCustomersHandler
} from "../controllers/customer.controller.ts";
import { Router } from "express";
import { protectRoute, requireEmployee } from "../middleware/auth.middleware.ts";

const router = Router();

router.post("/customers", protectRoute, createCustomerHandler);
router.get("/customers", getAllCustomersHandler);
// Registered before /customers/:id so Express doesn't read "search" as an id.
router.get("/customers/search", protectRoute, requireEmployee, searchCustomersHandler);
router.get("/customers/:id", getCustomerByIdHandler);
router.put("/customers/:id", updateCustomerProfileHandler);
router.delete("/customers/:id", deleteCustomerHandler);

export default router;
