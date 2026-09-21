import { Router } from "express";
import { createManagerHandler, getAllManagersHandler, getManagerByIdHandler } from "../controllers/manager.controller.ts";

const router = Router();

router.post("/manager", createManagerHandler);
router.get("/managers", getAllManagersHandler);
router.get("/manager/:id", getManagerByIdHandler);

export default router;
