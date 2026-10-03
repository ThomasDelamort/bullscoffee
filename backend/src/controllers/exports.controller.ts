import type { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { datasetList, DATASETS, exportFileName, getExport, isDatasetId, listExports, startExport } from "../lib/exports.ts";
import { isS3Configured, readFile } from "../lib/s3.ts";
import { isOutsideBusinessHours, recordActivity } from "../providers/activity.provider.ts";
import type { Employee } from "../types/employee.types.ts";

const isDate = (value: unknown): value is string =>
  typeof value === "string" &&
  /^\d{4}-\d{2}-\d{2}$/.test(value) &&
  new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;

export const listExportsHandler = async (_req: Request, res: Response): Promise<void> => {
  try {
    res.status(StatusCodes.OK).json({
      message: "Exports",
      data: { datasets: datasetList(), storage_configured: isS3Configured(), jobs: await listExports() },
    });
  } catch (error: any) {
    console.error("listExportsHandler failed:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Failed to fetch exports" });
  }
};

// POST { dataset, format: csv|json, from?, to? }: 202 with the in-progress job.
export const createExportHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const { dataset, format, from, to } = req.body ?? {};
    if (
      !isDatasetId(dataset) ||
      (format !== "csv" && format !== "json") ||
      !(from === undefined || from === null || from === "" || isDate(from)) ||
      !(to === undefined || to === null || to === "" || isDate(to))
    ) {
      res.status(StatusCodes.BAD_REQUEST).json({
        error: `dataset must be one of ${Object.keys(DATASETS).join(", ")}, format csv or json, and from/to YYYY-MM-DD dates`,
      });
      return;
    }
    if (from && to && from > to) {
      res.status(StatusCodes.BAD_REQUEST).json({ error: "The start date must be on or before the end date" });
      return;
    }
    if (!isS3Configured()) {
      res.status(StatusCodes.SERVICE_UNAVAILABLE).json({ error: "Storage isn't set up: AWS_S3_BUCKET and AWS_REGION are needed" });
      return;
    }

    const admin: Employee = res.locals["employee"];
    const job = await startExport(
      { dataset, format, from: from || null, to: to || null },
      `${admin.first_name} ${admin.last_name}`,
    );
    const range = DATASETS[dataset].ranged && (from || to) ? ` (${from || "start"} to ${to || "today"})` : "";
    recordActivity(req, res, {
      module: "Data",
      action: `Exported ${DATASETS[dataset].label.toLowerCase()}${range} as ${format.toUpperCase()}`,
      flag: isOutsideBusinessHours() ? "Data export outside business hours" : null,
    });
    res.status(StatusCodes.ACCEPTED).json({ message: "Export started", data: job });
  } catch (error: any) {
    console.error("createExportHandler failed:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Failed to start the export" });
  }
};

export const downloadExportHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = Number(req.params["id"]);
    const job = Number.isInteger(id) ? await getExport(id) : undefined;
    if (!job?.s3_key || job.status !== "completed") {
      res.status(StatusCodes.NOT_FOUND).json({ error: "No finished export with that ID (exports are kept 7 days)" });
      return;
    }
    const file = await readFile(job.s3_key);
    res.attachment(exportFileName(job));
    res.status(StatusCodes.OK).send(Buffer.from(file));
  } catch (error: any) {
    console.error("downloadExportHandler failed:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Failed to download the export" });
  }
};
