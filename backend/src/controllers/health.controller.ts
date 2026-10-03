import type { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { getHealthReport, runDiagnostics } from "../lib/health.ts";
import { recordActivity } from "../providers/activity.provider.ts";

export const getHealthHandler = async (_req: Request, res: Response): Promise<void> => {
  try {
    res.status(StatusCodes.OK).json({ message: "System health", data: await getHealthReport() });
  } catch (error: any) {
    console.error("getHealthHandler failed:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Failed to read system health" });
  }
};

export const runDiagnosticsHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const lines = await runDiagnostics();
    recordActivity(req, res, { module: "Health", action: "Ran diagnostics" });
    res.status(StatusCodes.OK).json({ message: "Diagnostics finished", data: { lines } });
  } catch (error: any) {
    console.error("runDiagnosticsHandler failed:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Diagnostics failed to run" });
  }
};
