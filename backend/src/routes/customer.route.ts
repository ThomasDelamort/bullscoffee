import {
  createCustomerHandler,
  deleteCustomerHandler,
  getCustomerByIdHandler,
  getAllCustomersHandler,
  updateCustomerProfileHandler,
  searchCustomersHandler
} from "../controllers/customer.controller.ts";
import { Router } from "express";
import { protectRoute, requireAdmin, requireEmployee } from "../middleware/auth.middleware.ts";

const router = Router();

// A customer registers themself right after signing in.
router.post("/customers", protectRoute, createCustomerHandler);
// Registered before /customers/:id so Express doesn't read "search" as an id.
router.get("/customers/search", protectRoute, requireEmployee, searchCustomersHandler);
// Reading, editing or deleting any customer's record is for admins only; the
// storefront never calls these.
router.get("/customers", protectRoute, requireAdmin, getAllCustomersHandler);
router.get("/customers/:id", protectRoute, requireAdmin, getCustomerByIdHandler);
router.put("/customers/:id", protectRoute, requireAdmin, updateCustomerProfileHandler);
router.delete("/customers/:id", protectRoute, requireAdmin, deleteCustomerHandler);

export default router;
