import { Router } from "express";
import { createManagerHandler } from "../controllers/manager.controller.ts";

const router = Router();

router.post("/", createManagerHandler);

export default router;
