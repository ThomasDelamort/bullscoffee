import { randomUUID } from "node:crypto";
import type { Request, Response } from "express";
import { clerkClient } from "@clerk/express";
import { StatusCodes } from "http-status-codes";
import { withTransaction } from "../lib/sql.ts";
import { recordActivity } from "../providers/activity.provider.ts";
import {
  countOtherActiveAdmins,
  findAccount,
  isInvitePlaceholder,
  listAdminUsers,
  revokeAllSessions,
  setEmployeeStatus,
} from "../providers/admin-users.provider.ts";
import { getEmployeeById, updateEmployee } from "../providers/employee.provider.ts";
import type { EmployeeChanges } from "../providers/employee.provider.ts";
import type { Employee } from "../types/employee.types.ts";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ROLES = ["admin", "manager", "cashier"] as const;
type StaffRole = (typeof ROLES)[number];

const isText = (value: unknown, max: number): value is string =>
  typeof value === "string" && value.trim() !== "" && value.trim().length <= max;

const isRole = (value: unknown): value is StaffRole => ROLES.includes(value as StaffRole);

// Clerk's API errors carry a readable message one level down.
const clerkMessage = (error: any): string =>
  error?.errors?.[0]?.longMessage ?? error?.errors?.[0]?.message ?? error?.message ?? "Clerk request failed";

const fullName = (e: Pick<Employee, "first_name" | "last_name">) => `${e.first_name} ${e.last_name}`;

const conflict = (res: Response, error: string) => res.status(StatusCodes.CONFLICT).json({ error });

export const listUsersHandler = async (_req: Request, res: Response): Promise<void> => {
  try {
    res.status(StatusCodes.OK).json({ message: "Users", data: await listAdminUsers() });
  } catch (error: any) {
    console.error("listUsersHandler failed:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Failed to fetch users" });
  }
};

// Adds the employee with an invite placeholder and sends a Clerk invitation.
// When they sign up (or sign in, if they already have an account) with the
// invited address, GET /manager/me links the row to them. If Clerk refuses
// the invitation, the employee row is rolled back too.
export const inviteUserHandler = async (req: Request, res: Response): Promise<void> => {
  const { first_name, last_name, email, role, work_schedule } = req.body ?? {};
  if (
    !isText(first_name, 50) ||
    !isText(last_name, 50) ||
    !isText(email, 255) ||
    !EMAIL.test(email.trim()) ||
    !isRole(role) ||
    !isText(work_schedule, 50)
  ) {
    res.status(StatusCodes.BAD_REQUEST).json({
      error: "first_name, last_name, a valid email, a role of admin, manager or cashier, and a work_schedule are required",
    });
    return;
  }

  const address = email.trim().toLowerCase();
  const appUrl = process.env["APP_URL"]?.replace(/\/+$/, "");
  try {
    const employee = await withTransaction(async (client) => {
      const inserted = await client.query(
        `
          INSERT INTO employees (clerk_id, first_name, last_name, employee_email, employee_role, work_schedule)
          VALUES ($1, $2, $3, $4, $5, $6)
          RETURNING *
        `,
        [`invite_${randomUUID()}`, first_name.trim(), last_name.trim(), address, role, work_schedule.trim()],
      );
      await clerkClient.invitations.createInvitation({
        emailAddress: address,
        ignoreExisting: true,
        ...(appUrl ? { redirectUrl: `${appUrl}/sign-up` } : {}),
      });
      return inserted.rows[0] as Employee;
    });

    recordActivity(req, res, {
      module: "Users",
      action: `Invited ${fullName(employee)} (${address}) as ${role}`,
      ...(role === "admin" ? { severity: "critical" as const, flag: "New admin invited" } : {}),
    });
    res.status(StatusCodes.CREATED).json({ message: `Invite sent to ${address}`, data: employee });
  } catch (error: any) {
    if (error?.code === "23505") {
      conflict(res, "An employee with that email already exists");
      return;
    }
    if (error?.clerkError || error?.errors) {
      console.error("inviteUserHandler: Clerk refused the invitation:", error);
      res.status(StatusCodes.BAD_GATEWAY).json({ error: `Couldn't send the invite: ${clerkMessage(error)}` });
      return;
    }
    console.error("inviteUserHandler failed:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Failed to invite user" });
  }
};

// PATCH /admin/users/employees/:id { employee_role?, work_schedule? }
export const updateStaffHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const employee_id = Number(req.params["id"]);
    const { employee_role, work_schedule } = req.body ?? {};
    if (
      !Number.isInteger(employee_id) ||
      !(employee_role === undefined || isRole(employee_role)) ||
      !(work_schedule === undefined || isText(work_schedule, 50))
    ) {
      res.status(StatusCodes.BAD_REQUEST).json({
        error: "employee_role must be admin, manager or cashier, and work_schedule 1 to 50 characters",
      });
      return;
    }

    const admin: Employee = res.locals["employee"];
    const target = await getEmployeeById(employee_id);
    if (!target) {
      res.status(StatusCodes.NOT_FOUND).json({ error: "Employee not found" });
      return;
    }
    const roleChanges = employee_role !== undefined && employee_role !== target.employee_role;
    if (roleChanges && target.employee_id === admin.employee_id) {
      conflict(res, "You can't change your own role. Ask another admin.");
      return;
    }
    if (
      roleChanges &&
      target.employee_role === "admin" &&
      target.employee_status === "active" &&
      (await countOtherActiveAdmins(employee_id)) === 0
    ) {
      conflict(res, "This is the last active admin. Make someone else an admin first.");
      return;
    }

    const changes: EmployeeChanges = {
      ...(employee_role !== undefined ? { employee_role } : {}),
      ...(work_schedule !== undefined ? { work_schedule: work_schedule.trim() } : {}),
    };
    const employee = await updateEmployee(employee_id, changes);
    if (!employee) {
      res.status(StatusCodes.NOT_FOUND).json({ error: "Employee not found" });
      return;
    }

    if (roleChanges) {
      recordActivity(req, res, {
        module: "Users",
        action: `Changed ${fullName(employee)}'s role (${target.employee_role} → ${employee.employee_role})`,
        ...(employee.employee_role === "admin"
          ? { severity: "critical" as const, flag: "Role changed to admin" }
          : {}),
      });
    }
    if (work_schedule !== undefined && work_schedule.trim() !== target.work_schedule) {
      recordActivity(req, res, {
        module: "Users",
        action: `Changed ${fullName(employee)}'s schedule to "${employee.work_schedule}"`,
      });
    }
    res.status(StatusCodes.OK).json({ message: "Employee updated", data: employee });
  } catch (error: any) {
    console.error("updateStaffHandler failed:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Failed to update employee" });
  }
};

type AccountAction = "lock" | "unlock" | "deactivate" | "reactivate" | "sign-out";

const DONE: Record<AccountAction, string> = {
  lock: "Locked",
  unlock: "Unlocked",
  deactivate: "Deactivated",
  reactivate: "Reactivated",
  "sign-out": "Signed out everywhere:",
};

// POST /admin/users/:clerkId/(lock|unlock|deactivate|reactivate|sign-out)
export const accountActionHandler =
  (action: AccountAction) =>
  async (req: Request, res: Response): Promise<void> => {
    try {
      const clerk_id = String(req.params["clerkId"] ?? "");
      const account = await findAccount(clerk_id);
      if (!account) {
        res.status(StatusCodes.NOT_FOUND).json({ error: "No user with that ID" });
        return;
      }

      const admin: Employee = res.locals["employee"];
      const self = clerk_id === admin.clerk_id;
      const invited = isInvitePlaceholder(clerk_id);
      const target = account.employee;

      if (self && action !== "unlock" && action !== "reactivate") {
        conflict(res, "You can't do that to your own account.");
        return;
      }
      if (invited && (action === "lock" || action === "unlock" || action === "sign-out")) {
        conflict(res, `${account.name} hasn't accepted their invite yet, so there's no account to ${action === "sign-out" ? "sign out" : action}.`);
        return;
      }
      if (
        action === "deactivate" &&
        target?.employee_role === "admin" &&
        target.employee_status === "active" &&
        (await countOtherActiveAdmins(target.employee_id!)) === 0
      ) {
        conflict(res, "This is the last active admin. Make someone else an admin first.");
        return;
      }

      let detail = "";
      if (action === "lock") await clerkClient.users.lockUser(clerk_id);
      if (action === "unlock") await clerkClient.users.unlockUser(clerk_id);
      if (action === "deactivate" || action === "reactivate") {
        const active = action === "reactivate";
        if (target) await setEmployeeStatus(target.employee_id!, active ? "active" : "inactive");
        if (!invited) {
          await (active ? clerkClient.users.unbanUser(clerk_id) : clerkClient.users.banUser(clerk_id));
        }
      }
      if (action === "sign-out") {
        const ended = await revokeAllSessions(clerk_id);
        detail = ` (${ended} session${ended === 1 ? "" : "s"} ended)`;
      }

      recordActivity(req, res, {
        module: "Users",
        action: `${DONE[action]} ${account.name}${detail}`,
      });
      res.status(StatusCodes.OK).json({ message: `${DONE[action]} ${account.name}${detail}`, data: { clerk_id } });
    } catch (error: any) {
      console.error(`accountActionHandler (${action}) failed:`, error);
      if (error?.clerkError || error?.errors) {
        res.status(StatusCodes.BAD_GATEWAY).json({ error: `Clerk: ${clerkMessage(error)}` });
        return;
      }
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Failed to update the account" });
    }
  };
