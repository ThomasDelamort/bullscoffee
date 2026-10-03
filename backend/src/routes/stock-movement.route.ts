import { getStockMovementsHandler, createStockMovementHandler} from "../controllers/stock-movement.controller.ts";
import { Router } from "express";
import { protectRoute, requirePermission } from "../middleware/auth.middleware.ts";

const router = Router();

router.get("/stock-movements", protectRoute, requirePermission("inventory.manage"), getStockMovementsHandler);
router.post("/stock-movements", protectRoute, requirePermission("inventory.manage"), createStockMovementHandler);

export default router;
