import type { Request, Response } from "express";
import { clerkClient } from "@clerk/express";
import { StatusCodes } from "http-status-codes";
import {
  isEmailConfigured,
  logSend,
  renderTemplate,
  sendEmail,
  TEMPLATE_VARIABLES,
} from "../lib/notify.ts";
import { recordActivity } from "../providers/activity.provider.ts";
import {
  getNotificationLog,
  getTemplate,
  listTemplates,
  updateTemplate,
  type TemplateChanges,
} from "../providers/notifications.provider.ts";
import { getSettings } from "../providers/settings.provider.ts";
import type { Employee } from "../types/employee.types.ts";

export const listTemplatesHandler = async (_req: Request, res: Response): Promise<void> => {
  try {
    res.status(StatusCodes.OK).json({
      message: "Notification templates",
      data: {
        templates: await listTemplates(),
        email_configured: isEmailConfigured(),
        // Each variable with the sample value the preview and test sends use.
        variables: TEMPLATE_VARIABLES,
      },
    });
  } catch (error: any) {
    console.error("listTemplatesHandler failed:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Failed to fetch templates" });
  }
};

function parseChanges(body: any): TemplateChanges | string {
  const { name, subject, body: text, enabled } = body ?? {};
  const fits = (value: unknown, max: number) =>
    typeof value === "string" && value.trim() !== "" && value.length <= max;
  if (name !== undefined && !fits(name, 100)) return "name must be 1 to 100 characters";
  if (subject !== undefined && !fits(subject, 200)) return "subject must be 1 to 200 characters";
  if (text !== undefined && !fits(text, 5000)) return "body must be 1 to 5,000 characters";
  if (enabled !== undefined && typeof enabled !== "boolean") return "enabled must be true or false";
  return { name: name?.trim(), subject: subject?.trim(), body: text, enabled };
}

export const updateTemplateHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const changes = parseChanges(req.body);
    if (typeof changes === "string") {
      res.status(StatusCodes.BAD_REQUEST).json({ error: changes });
      return;
    }
    const template_id = String(req.params["id"]);
    const before = await getTemplate(template_id);
    const template = await updateTemplate(template_id, changes);
    if (!before || !template) {
      res.status(StatusCodes.NOT_FOUND).json({ error: "Template not found" });
      return;
    }
    const switched = before.enabled !== template.enabled ? ` (switched ${template.enabled ? "on" : "off"})` : "";
    recordActivity(req, res, {
      module: "Settings",
      action: `Saved the "${template.name}" email template${switched}`,
    });
    res.status(StatusCodes.OK).json({ message: "Template saved", data: template });
  } catch (error: any) {
    console.error("updateTemplateHandler failed:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Failed to save the template" });
  }
};

// Sends the saved template, filled with sample values, to the signed-in
// admin's own address, and answers what happened (sent, failed or skipped).
export const sendTestHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const template = await getTemplate(String(req.params["id"]));
    if (!template) {
      res.status(StatusCodes.NOT_FOUND).json({ error: "Template not found" });
      return;
    }
    const admin: Employee = res.locals["employee"];
    const user = await clerkClient.users.getUser(admin.clerk_id);
    const recipient = user.primaryEmailAddress?.emailAddress ?? admin.employee_email;
    const settings = await getSettings();
    const values = { ...TEMPLATE_VARIABLES, store_name: settings.store_name };

    const result = await sendEmail({
      to: recipient,
      subject: `[Test] ${renderTemplate(template.subject, values)}`,
      text: renderTemplate(template.body, values),
      replyTo: settings.support_email,
      storeName: settings.store_name,
    });
    await logSend(template.id, null, recipient, result);
    res.status(StatusCodes.OK).json({
      message: result.status === "sent" ? `Test sent to ${recipient}` : `Test ${result.status}`,
      data: { ...result, recipient },
    });
  } catch (error: any) {
    console.error("sendTestHandler failed:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Failed to send the test" });
  }
};

export const getNotificationLogHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const limit = Number(req.query["limit"] ?? 50);
    if (!Number.isInteger(limit) || limit < 1 || limit > 500) {
      res.status(StatusCodes.BAD_REQUEST).json({ error: "limit must be 1 to 500" });
      return;
    }
    res.status(StatusCodes.OK).json({ message: "Notification log", data: await getNotificationLog(limit) });
  } catch (error: any) {
    console.error("getNotificationLogHandler failed:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Failed to fetch the notification log" });
  }
};
