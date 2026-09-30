import {
  createCustomerHandler,
  deleteCustomerHandler,
  getCustomerByIdHandler,
  getAllCustomersHandler,
  updateCustomerProfileHandler,
} from "../controllers/customer.controller.ts";
import { Router } from "express";
import { protectRoute } from "../middleware/auth.middleware.ts";

const router = Router();

router.post("/customers", protectRoute, createCustomerHandler);
router.get("/customers", protectRoute, getAllCustomersHandler);
router.get("/customers/:id", protectRoute, getCustomerByIdHandler);
router.put("/customers/:id", protectRoute, updateCustomerProfileHandler);
router.delete("/customers/:id", protectRoute, deleteCustomerHandler);

export default router;
