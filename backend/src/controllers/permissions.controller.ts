import type { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import {
  getPermissionMatrix,
  isGrantable,
  permissionLabel,
  PERMISSIONS,
  savePermissionMatrix,
  type PermissionMatrix,
} from "../lib/permissions.ts";
import { recordActivity } from "../providers/activity.provider.ts";

const catalogue = PERMISSIONS.map(({ seed: _seed, ...permission }) => permission);

export const getPermissionsHandler = async (_req: Request, res: Response): Promise<void> => {
  try {
    res.status(StatusCodes.OK).json({
      message: "Permissions",
      data: { catalogue, matrix: await getPermissionMatrix() },
    });
  } catch (error: any) {
    console.error("getPermissionsHandler failed:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Failed to fetch permissions" });
  }
};

const isGrantList = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every(isGrantable);

// PUT { matrix: { manager: [...ids], cashier: [...ids] } }. Admin-only
// (system.*) and unknown ids are refused rather than dropped, so a stale page
// can't silently save something other than what it shows.
export const savePermissionsHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const matrix = req.body?.matrix;
    if (!matrix || !isGrantList(matrix.manager) || !isGrantList(matrix.cashier)) {
      res.status(StatusCodes.BAD_REQUEST).json({
        error: "matrix.manager and matrix.cashier must be lists of permission ids; System permissions stay with admins",
      });
      return;
    }

    const before = await getPermissionMatrix();
    const saved = await savePermissionMatrix({ manager: matrix.manager, cashier: matrix.cashier });

    const changes = (Object.keys(saved) as (keyof PermissionMatrix)[]).flatMap((role) => {
      const added = saved[role].filter((id) => !before[role].includes(id));
      const removed = before[role].filter((id) => !saved[role].includes(id));
      return [
        ...added.map((id) => `${role} +${permissionLabel(id)}`),
        ...removed.map((id) => `${role} −${permissionLabel(id)}`),
      ];
    });
    if (changes.length > 0) {
      recordActivity(req, res, { module: "Roles", action: `Changed permissions: ${changes.join("; ")}` });
    }
    res.status(StatusCodes.OK).json({
      message: "Permissions saved",
      data: { catalogue, matrix: saved },
    });
  } catch (error: any) {
    console.error("savePermissionsHandler failed:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Failed to save permissions" });
  }
};
