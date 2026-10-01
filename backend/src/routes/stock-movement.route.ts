import { getStockMovementsHandler, createStockMovementHandler} from "../controllers/stock-movement.controller.ts";
import { Router } from "express";

const router = Router();

router.get("/stock-movements", getStockMovementsHandler);
router.post("/stock-movements", createStockMovementHandler);

export default router;