import {
  createCustomerHandler,
  deleteCustomerHandler,
  getCustomerByIdHandler,
  getAllCustomersHandler,
  updateCustomerProfileHandler,
  searchCustomersHandler
} from "../controllers/customer.controller.ts";
import { Router } from "express";
import { protectRoute } from "../middleware/auth.middleware.ts";

const router = Router();

router.post("/customers", protectRoute, createCustomerHandler);
router.get("/customers", getAllCustomersHandler);
router.get("/customers/:id", getCustomerByIdHandler);
router.put("/customers/:id", updateCustomerProfileHandler);
router.delete("/customers/:id", deleteCustomerHandler);
router.get("/customers/search", searchCustomersHandler);

export default router;
