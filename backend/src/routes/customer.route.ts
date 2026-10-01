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

router.post("/customers", createCustomerHandler);
router.get("/customers", getAllCustomersHandler);
router.get("/customers/:id", getCustomerByIdHandler);
router.put("/customers/:id", updateCustomerProfileHandler);
router.delete("/customers/:id", deleteCustomerHandler);

export default router;
