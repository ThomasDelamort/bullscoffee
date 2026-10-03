import { Router } from "express";
import {
  getActivityHandler,
  getActivityModulesHandler,
  getSignInStatsHandler,
  reviewActivityHandler,
} from "../controllers/activity.controller.ts";
import {
  accountActionHandler,
  inviteUserHandler,
  listUsersHandler,
  updateStaffHandler,
} from "../controllers/admin-users.controller.ts";
import {
  getNotificationLogHandler,
  listTemplatesHandler,
  sendTestHandler,
  updateTemplateHandler,
} from "../controllers/notifications.controller.ts";
import { getPermissionsHandler, savePermissionsHandler } from "../controllers/permissions.controller.ts";
import { getSettingsHandler, updateSettingsHandler } from "../controllers/settings.controller.ts";
import {
  getTicketHandler,
  listTicketsHandler,
  replyToTicketHandler,
  updateTicketHandler,
} from "../controllers/tickets.controller.ts";
import { protectRoute, requireAdmin } from "../middleware/auth.middleware.ts";

// Mounted at /api/admin. Every route below is for active admins only: the
// guard runs once here, so no admin route can be added without it.
const router = Router();

router.use(protectRoute, requireAdmin);

/*
    ACTIVITY LOG & AUDIT TRAIL
*/
router.get("/activity", getActivityHandler);
router.get("/activity/modules", getActivityModulesHandler);
router.get("/activity/stats/sign-ins", getSignInStatsHandler);
router.patch("/activity/:id/review", reviewActivityHandler);

/*
    USERS - employees and customers, with their Clerk account state
*/
router.get("/users", listUsersHandler);
router.post("/users", inviteUserHandler);
router.patch("/users/employees/:id", updateStaffHandler);
router.post("/users/:clerkId/lock", accountActionHandler("lock"));
router.post("/users/:clerkId/unlock", accountActionHandler("unlock"));
router.post("/users/:clerkId/deactivate", accountActionHandler("deactivate"));
router.post("/users/:clerkId/reactivate", accountActionHandler("reactivate"));
router.post("/users/:clerkId/sign-out", accountActionHandler("sign-out"));

/*
    ROLES & PERMISSIONS
*/
router.get("/permissions", getPermissionsHandler);
router.put("/permissions", savePermissionsHandler);

/*
    SETTINGS
*/
router.get("/settings", getSettingsHandler);
router.put("/settings", updateSettingsHandler);

/*
    NOTIFICATION TEMPLATES (email)
*/
router.get("/notifications/templates", listTemplatesHandler);
router.put("/notifications/templates/:id", updateTemplateHandler);
router.post("/notifications/templates/:id/test", sendTestHandler);
router.get("/notifications/log", getNotificationLogHandler);

/*
    SUPPORT TICKETS
*/
router.get("/tickets", listTicketsHandler);
router.get("/tickets/:id", getTicketHandler);
router.patch("/tickets/:id", updateTicketHandler);
router.post("/tickets/:id/replies", replyToTicketHandler);

export default router;
