import type { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import {
  getSalesExportRows,
  getSalesReport,
} from "../providers/report.provider.ts";
import type { ReportPeriod } from "../types/report.types.ts";

const isDate = (value: string): boolean => {
  const parsed = new Date(`${value}T00:00:00Z`);
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    !Number.isNaN(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === value
  );
};

// ?period=daily|monthly&date=YYYY-MM-DD. Period defaults to daily and date to
// today (the provider fills that in). Returns an error message when invalid.
const readReportQuery = (
  req: Request,
): { period: ReportPeriod; date: string | undefined } | string => {
  const period = req.query["period"] ?? "daily";
  const date = req.query["date"];

  if (period !== "daily" && period !== "monthly") {
    return "period must be daily or monthly";
  }
  if (date === undefined || date === "") return { period, date: undefined };
  if (typeof date !== "string" || !isDate(date)) {
    return "date must be in YYYY-MM-DD format";
  }
  return { period, date };
};

const CSV_COLUMNS = [
  "order_id",
  "ordered_at",
  "cashier",
  "customer",
  "discount_amount",
  "total_amount",
  "payment_methods",
] as const;

// Quotes what needs quoting. Customer names come from user-editable Clerk
// profiles, so cells that a spreadsheet would run as a formula get a leading
// apostrophe.
const csvCell = (value: unknown): string => {
  if (value === null || value === undefined) return "";
  let text = value instanceof Date ? value.toISOString() : String(value);
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

export const getSalesReportHandler = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const query = readReportQuery(req);
    if (typeof query === "string") {
      res.status(StatusCodes.BAD_REQUEST).json({ error: query });
      return;
    }

    const report = await getSalesReport(query.period, query.date);
    res
      .status(StatusCodes.OK)
      .json({ message: "Successfully fetched sales report", data: report });
  } catch (error: any) {
    console.error("getSalesReportHandler failed:", error);
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ error: "Failed to fetch sales report" });
  }
};

// CSV download: one row per completed order in the period.
export const exportSalesReportHandler = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const query = readReportQuery(req);
    if (typeof query === "string") {
      res.status(StatusCodes.BAD_REQUEST).json({ error: query });
      return;
    }

    const rows = await getSalesExportRows(query.period, query.date);
    const lines = [
      CSV_COLUMNS.join(","),
      ...rows.map((row) =>
        CSV_COLUMNS.map((column) => csvCell(row[column])).join(","),
      ),
    ];

    const day = query.date ?? new Date().toLocaleDateString("en-CA");
    const label = query.period === "monthly" ? day.slice(0, 7) : day;
    // res.attachment also sets the text/csv content type from the extension.
    res.attachment(`sales-${query.period}-${label}.csv`);
    // The BOM makes Excel read the file as UTF-8.
    res.status(StatusCodes.OK).send(`﻿${lines.join("\r\n")}\r\n`);
  } catch (error: any) {
    console.error("exportSalesReportHandler failed:", error);
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ error: "Failed to export sales report" });
  }
};
