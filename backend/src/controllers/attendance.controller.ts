import type { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import {
  getAttendance,
  setAttendanceTimeOut,
} from "../providers/attendance.provider.ts";

const queryText = (value: unknown): string | undefined =>
  typeof value === "string" && value.trim() !== "" ? value.trim() : undefined;

// undefined when absent, NaN-or-fraction when present but not a whole number.
const queryInt = (value: unknown): number | undefined => {
  const text = queryText(value);
  return text === undefined ? undefined : Number(text);
};

const isDate = (value: string): boolean => {
  const parsed = new Date(`${value}T00:00:00Z`);
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    !Number.isNaN(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === value
  );
};

export const getAttendanceHandler = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const from = queryText(req.query["from"]);
    const to = queryText(req.query["to"]);
    const employee_id = queryInt(req.query["employee_id"]);

    if (
      (from !== undefined && !isDate(from)) ||
      (to !== undefined && !isDate(to))
    ) {
      res
        .status(StatusCodes.BAD_REQUEST)
        .json({ error: "from and to must be dates in YYYY-MM-DD format" });
      return;
    }
    if (employee_id !== undefined && !Number.isInteger(employee_id)) {
      res
        .status(StatusCodes.BAD_REQUEST)
        .json({ error: "Invalid employee ID" });
      return;
    }

    const logs = await getAttendance({ from, to, employee_id });
    res
      .status(StatusCodes.OK)
      .json({ message: "Successfully fetched attendance", data: logs });
  } catch (error: any) {
    console.error("getAttendanceHandler failed:", error);
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ error: "Failed to fetch attendance" });
  }
};

// Closes a shift the employee forgot to clock out of.
export const setAttendanceTimeOutHandler = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const log_id = Number(req.params["id"]);
    if (!Number.isInteger(log_id)) {
      res
        .status(StatusCodes.BAD_REQUEST)
        .json({ error: "Invalid attendance log ID" });
      return;
    }

    const { time_out } = req.body ?? {};
    const timeOut = typeof time_out === "string" ? new Date(time_out) : null;
    if (!timeOut || Number.isNaN(timeOut.getTime())) {
      res
        .status(StatusCodes.BAD_REQUEST)
        .json({ error: "time_out must be a valid date and time" });
      return;
    }

    const log = await setAttendanceTimeOut(log_id, timeOut);
    if (!log) {
      res
        .status(StatusCodes.NOT_FOUND)
        .json({ error: "Attendance log not found" });
      return;
    }
    res
      .status(StatusCodes.OK)
      .json({ message: "Successfully set clock-out time", data: log });
  } catch (error: any) {
    console.error("setAttendanceTimeOutHandler failed:", error);
    // Check violation: time_out must be after time_in
    if (error?.code === "23514") {
      res
        .status(StatusCodes.BAD_REQUEST)
        .json({ error: "time_out must be after the clock-in time" });
      return;
    }
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ error: "Failed to set clock-out time" });
  }
};
