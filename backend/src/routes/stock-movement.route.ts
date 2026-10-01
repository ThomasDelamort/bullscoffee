import { getStockMovementsHandler, createStockMovementHandler} from "../controllers/stock-movement.controller.ts";
import { Router } from "express";
import { protectRoute, requireManager } from "../middleware/auth.middleware.ts";

const router = Router();

router.get("/stock-movements", protectRoute, requireManager, getStockMovementsHandler);
router.post("/stock-movements", protectRoute, requireManager, createStockMovementHandler);

export default router;
