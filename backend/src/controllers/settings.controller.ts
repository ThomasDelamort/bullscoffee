import type { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { recordActivity } from "../providers/activity.provider.ts";
import {
  GENERAL_COLUMNS,
  getPublicSettings,
  getSettings,
  updateSettings,
  type SystemSettings,
} from "../providers/settings.provider.ts";
import type { Employee } from "../types/employee.types.ts";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const LABELS: Record<(typeof GENERAL_COLUMNS)[number], string> = {
  store_name: "store name",
  support_email: "support email",
  online_ordering: "kiosk ordering",
  maintenance_mode: "maintenance mode",
  maintenance_message: "maintenance message",
};

// Public, for the kiosk (is ordering open?), the storefront's maintenance
// banner and the Contact page's support address.
export const getPublicSettingsHandler = async (_req: Request, res: Response): Promise<void> => {
  try {
    res.status(StatusCodes.OK).json({ message: "Store settings", data: await getPublicSettings() });
  } catch (error: any) {
    console.error("getPublicSettingsHandler failed:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Failed to fetch store settings" });
  }
};

export const getSettingsHandler = async (_req: Request, res: Response): Promise<void> => {
  try {
    res.status(StatusCodes.OK).json({ message: "Settings", data: await getSettings() });
  } catch (error: any) {
    console.error("getSettingsHandler failed:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Failed to fetch settings" });
  }
};

// Fields present in the body, each checked; an error message when any is invalid.
function parseGeneral(body: any): Partial<SystemSettings> | string {
  const { store_name, support_email, online_ordering, maintenance_mode, maintenance_message } = body ?? {};
  const text = (value: unknown, max: number) =>
    typeof value === "string" && value.trim() !== "" && value.trim().length <= max;

  if (store_name !== undefined && !text(store_name, 100)) return "store_name must be 1 to 100 characters";
  if (support_email !== undefined && !(text(support_email, 255) && EMAIL.test(support_email.trim()))) {
    return "support_email must be a valid email address";
  }
  if (online_ordering !== undefined && typeof online_ordering !== "boolean") return "online_ordering must be true or false";
  if (maintenance_mode !== undefined && typeof maintenance_mode !== "boolean") return "maintenance_mode must be true or false";
  if (maintenance_message !== undefined && !text(maintenance_message, 500)) {
    return "maintenance_message must be 1 to 500 characters";
  }
  return {
    store_name: store_name?.trim(),
    support_email: support_email?.trim(),
    online_ordering,
    maintenance_mode,
    maintenance_message: maintenance_message?.trim(),
  };
}

export const updateSettingsHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const changes = parseGeneral(req.body);
    if (typeof changes === "string") {
      res.status(StatusCodes.BAD_REQUEST).json({ error: changes });
      return;
    }

    const admin: Employee = res.locals["employee"];
    const before = await getSettings();
    const settings = await updateSettings(GENERAL_COLUMNS, changes, admin.employee_id!);

    const changed = GENERAL_COLUMNS.filter((column) => before[column] !== settings[column]);
    if (changed.length > 0) {
      const maintenanceOn = !before.maintenance_mode && settings.maintenance_mode;
      recordActivity(req, res, {
        module: "Settings",
        action: `Changed settings: ${changed
          .map((column) =>
            typeof settings[column] === "boolean"
              ? `${LABELS[column]} ${settings[column] ? "on" : "off"}`
              : LABELS[column],
          )
          .join(", ")}`,
        ...(maintenanceOn ? { flag: "Maintenance mode turned on" } : {}),
      });
    }
    res.status(StatusCodes.OK).json({ message: "Settings saved", data: settings });
  } catch (error: any) {
    console.error("updateSettingsHandler failed:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Failed to save settings" });
  }
};
