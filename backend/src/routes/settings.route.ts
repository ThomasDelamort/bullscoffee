import { Router } from "express";
import { getPublicSettingsHandler } from "../controllers/settings.controller.ts";

const router = Router();

// Public: the kiosk, the storefront banner and the Contact page read these.
// Editing them is under /api/admin/settings.
router.get("/settings/public", getPublicSettingsHandler);

export default router;
