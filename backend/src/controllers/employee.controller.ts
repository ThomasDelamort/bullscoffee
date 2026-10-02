import { randomUUID } from "node:crypto";
import type { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import {
  createEmployee,
  getEmployeeById,
  getEmployees,
  updateEmployee,
} from "../providers/employee.provider.ts";
import type { EmployeeChanges } from "../providers/employee.provider.ts";
import type { Employee } from "../types/employee.types.ts";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const isText = (value: unknown): value is string =>
  typeof value === "string" && value.trim() !== "";

const isOptionalText = (value: unknown): value is string | null | undefined =>
  value === undefined || value === null || typeof value === "string";

const isRole = (value: unknown): value is Employee["employee_role"] =>
  value === "manager" || value === "cashier";

const isStatus = (value: unknown): value is "active" | "inactive" =>
  value === "active" || value === "inactive";

export const getEmployeesHandler = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const role = req.query["role"];
    if (role !== undefined && role !== "" && !isRole(role)) {
      res
        .status(StatusCodes.BAD_REQUEST)
        .json({ error: "role must be manager or cashier" });
      return;
    }

    const employees = await getEmployees({
      role: role === "" ? undefined : role,
    });
    res
      .status(StatusCodes.OK)
      .json({ message: "Successfully fetched employees", data: employees });
  } catch (error: any) {
    console.error("getEmployeesHandler failed:", error);
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ error: "Failed to fetch employees" });
  }
};

export const getEmployeeByIdHandler = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const employee_id = Number(req.params["id"]);
    if (!Number.isInteger(employee_id)) {
      res
        .status(StatusCodes.BAD_REQUEST)
        .json({ error: "Invalid employee ID" });
      return;
    }

    const employee = await getEmployeeById(employee_id);
    if (!employee) {
      res.status(StatusCodes.NOT_FOUND).json({ error: "Employee not found" });
      return;
    }
    res
      .status(StatusCodes.OK)
      .json({ message: "Employee found", data: employee });
  } catch (error: any) {
    console.error("getEmployeeByIdHandler failed:", error);
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ error: "Failed to fetch employee by ID" });
  }
};

// The Manager UI adds staff without a Clerk account yet, so clerk_id is
// optional and falls back to an invite placeholder.
export const createEmployeeHandler = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const {
      clerk_id,
      first_name,
      last_name,
      employee_email,
      contact_number,
      profile_picture,
      employee_status,
      employee_role,
      work_schedule,
    } = req.body ?? {};

    if (
      !isText(first_name) ||
      !isText(last_name) ||
      !isText(employee_email) ||
      !EMAIL.test(employee_email.trim()) ||
      !isText(work_schedule) ||
      !(clerk_id === undefined || isText(clerk_id)) ||
      !isOptionalText(contact_number) ||
      !isOptionalText(profile_picture) ||
      !(employee_status === undefined || isStatus(employee_status)) ||
      !(employee_role === undefined || isRole(employee_role))
    ) {
      res.status(StatusCodes.BAD_REQUEST).json({
        error:
          "first_name, last_name, employee_email (valid) and work_schedule are required, and employee_status / employee_role must be valid",
      });
      return;
    }

    const employee: Employee = {
      clerk_id: clerk_id?.trim() ?? `invite_${randomUUID()}`,
      first_name: first_name.trim(),
      last_name: last_name.trim(),
      employee_email: employee_email.trim(),
      contact_number: contact_number?.trim() || null,
      profile_picture: profile_picture?.trim() || null,
      employee_status: employee_status ?? "active",
      employee_role: employee_role ?? "cashier",
      work_schedule: work_schedule.trim(),
    };

    const newEmployee = await createEmployee(employee);
    res
      .status(StatusCodes.CREATED)
      .json({ message: "Successfully registered employee", data: newEmployee });
  } catch (error: any) {
    console.error("createEmployeeHandler failed:", error);
    if (error?.code === "23505") {
      res.status(StatusCodes.CONFLICT).json({
        error: "An employee with that email or Clerk account already exists",
      });
      return;
    }
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ error: "Failed to create employee" });
  }
};

export const updateEmployeeHandler = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const employee_id = Number(req.params["id"]);
    if (!Number.isInteger(employee_id)) {
      res
        .status(StatusCodes.BAD_REQUEST)
        .json({ error: "Invalid employee ID" });
      return;
    }

    const {
      first_name,
      last_name,
      employee_email,
      contact_number,
      profile_picture,
      employee_status,
      employee_role,
      work_schedule,
    } = req.body ?? {};
    const changes: EmployeeChanges = {};
    const invalid: string[] = [];

    if (first_name !== undefined) {
      if (isText(first_name)) changes.first_name = first_name.trim();
      else invalid.push("first_name");
    }
    if (last_name !== undefined) {
      if (isText(last_name)) changes.last_name = last_name.trim();
      else invalid.push("last_name");
    }
    if (employee_email !== undefined) {
      if (isText(employee_email) && EMAIL.test(employee_email.trim())) {
        changes.employee_email = employee_email.trim();
      } else invalid.push("employee_email");
    }
    if (contact_number !== undefined) {
      if (isOptionalText(contact_number)) {
        changes.contact_number = contact_number?.trim() || null;
      } else invalid.push("contact_number");
    }
    // A multipart "image" file wins over the text field: uploadFile leaves
    // its URL on res.locals.fileUrl.
    const fileUrl = res.locals["fileUrl"];
    if (typeof fileUrl === "string") {
      changes.profile_picture = fileUrl;
    } else if (profile_picture !== undefined) {
      if (isOptionalText(profile_picture)) {
        changes.profile_picture = profile_picture?.trim() || null;
      } else invalid.push("profile_picture");
    }
    if (employee_status !== undefined) {
      if (isStatus(employee_status)) changes.employee_status = employee_status;
      else invalid.push("employee_status");
    }
    if (employee_role !== undefined) {
      if (isRole(employee_role)) changes.employee_role = employee_role;
      else invalid.push("employee_role");
    }
    if (work_schedule !== undefined) {
      if (isText(work_schedule)) changes.work_schedule = work_schedule.trim();
      else invalid.push("work_schedule");
    }

    if (invalid.length > 0) {
      res
        .status(StatusCodes.BAD_REQUEST)
        .json({ error: `Invalid: ${invalid.join(", ")}` });
      return;
    }

    const employee = await updateEmployee(employee_id, changes);
    if (!employee) {
      res.status(StatusCodes.NOT_FOUND).json({ error: "Employee not found" });
      return;
    }
    res
      .status(StatusCodes.OK)
      .json({ message: "Successfully updated employee", data: employee });
  } catch (error: any) {
    console.error("updateEmployeeHandler failed:", error);
    if (error?.code === "23505") {
      res
        .status(StatusCodes.CONFLICT)
        .json({ error: "An employee with that email already exists" });
      return;
    }
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ error: "Failed to update employee" });
  }
};
