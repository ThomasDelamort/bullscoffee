import type { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import {
  BackupInProgressError,
  deleteBackup,
  getBackup,
  listBackups,
  nextScheduledBackup,
  readBackupFile,
  restoreBackup,
  RestoreRefusedError,
  startBackup,
} from "../lib/backup.ts";
import { isS3Configured } from "../lib/s3.ts";
import { recordActivity } from "../providers/activity.provider.ts";
import { BACKUP_COLUMNS, getSettings, updateSettings, type SystemSettings } from "../providers/settings.provider.ts";
import type { Employee } from "../types/employee.types.ts";

const CONFIRM_WORD = "RESTORE";
const FREQUENCIES = ["hourly", "daily", "weekly"] as const;
const RETENTIONS = [7, 30, 90, 365] as const;

const scheduleOf = (s: SystemSettings) => ({
  backup_enabled: s.backup_enabled,
  backup_frequency: s.backup_frequency,
  backup_time: s.backup_time,
  backup_retention_days: s.backup_retention_days,
});

const parseId = (req: Request): number | undefined => {
  const id = Number(req.params["id"]);
  return Number.isInteger(id) && id > 0 ? id : undefined;
};

const adminName = (res: Response) => {
  const admin: Employee = res.locals["employee"];
  return `${admin.first_name} ${admin.last_name}`;
};

const when = (iso: string) =>
  new Date(iso).toLocaleString("en-PH", { timeZone: "Asia/Manila", dateStyle: "medium", timeStyle: "short" });

export const listBackupsHandler = async (_req: Request, res: Response): Promise<void> => {
  try {
    const [settings, backups, next_run] = await Promise.all([getSettings(), listBackups(), nextScheduledBackup()]);
    res.status(StatusCodes.OK).json({
      message: "Backups",
      data: { schedule: scheduleOf(settings), next_run, storage_configured: isS3Configured(), backups },
    });
  } catch (error: any) {
    console.error("listBackupsHandler failed:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Failed to fetch backups" });
  }
};

export const saveScheduleHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const { backup_enabled, backup_frequency, backup_time, backup_retention_days } = req.body ?? {};
    if (
      !(backup_enabled === undefined || typeof backup_enabled === "boolean") ||
      !(backup_frequency === undefined || FREQUENCIES.includes(backup_frequency)) ||
      !(backup_time === undefined || (typeof backup_time === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(backup_time))) ||
      !(backup_retention_days === undefined || RETENTIONS.includes(backup_retention_days))
    ) {
      res.status(StatusCodes.BAD_REQUEST).json({
        error: "backup_frequency must be hourly, daily or weekly, backup_time HH:MM, and backup_retention_days 7, 30, 90 or 365",
      });
      return;
    }
    const admin: Employee = res.locals["employee"];
    const settings = await updateSettings(
      BACKUP_COLUMNS,
      { backup_enabled, backup_frequency, backup_time, backup_retention_days },
      admin.employee_id!,
    );
    const schedule = scheduleOf(settings);
    recordActivity(req, res, {
      module: "Backups",
      action: schedule.backup_enabled
        ? `Set automatic backups to ${schedule.backup_frequency} at ${schedule.backup_time}, kept ${schedule.backup_retention_days} days`
        : "Turned automatic backups off",
    });
    res.status(StatusCodes.OK).json({
      message: "Schedule saved",
      data: { schedule, next_run: await nextScheduledBackup() },
    });
  } catch (error: any) {
    console.error("saveScheduleHandler failed:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Failed to save the schedule" });
  }
};

// Answers 202 with the in-progress row; the page polls until it finishes.
export const createBackupHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!isS3Configured()) {
      res.status(StatusCodes.SERVICE_UNAVAILABLE).json({ error: "Storage isn't set up: AWS_S3_BUCKET and AWS_REGION are needed" });
      return;
    }
    const { row, done } = await startBackup("manual", adminName(res));
    recordActivity(req, res, { module: "Backups", action: `Started backup #${row.id}` });
    done.catch(() => {});
    res.status(StatusCodes.ACCEPTED).json({ message: "Backup started", data: row });
  } catch (error: any) {
    if (error instanceof BackupInProgressError) {
      res.status(StatusCodes.CONFLICT).json({ error: "A backup is already running. Wait for it to finish." });
      return;
    }
    console.error("createBackupHandler failed:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Failed to start the backup" });
  }
};

export const downloadBackupHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseId(req);
    const backup = id === undefined ? undefined : await getBackup(id);
    if (!backup?.s3_key || backup.status !== "completed") {
      res.status(StatusCodes.NOT_FOUND).json({ error: "No finished backup with that ID" });
      return;
    }
    const file = await readBackupFile(backup.s3_key);
    const date = new Date(backup.created_at).toISOString().slice(0, 10);
    res.attachment(`bullscoffee-backup-${date}.json.gz`);
    res.type("application/gzip");
    recordActivity(req, res, { module: "Backups", action: `Downloaded backup #${backup.id}` });
    res.status(StatusCodes.OK).send(file);
  } catch (error: any) {
    console.error("downloadBackupHandler failed:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Failed to download the backup" });
  }
};

// POST { confirm: "RESTORE" }. Runs in one transaction while the request
// waits; the restore is always flagged in the audit trail, which a restore
// never touches.
export const restoreBackupHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseId(req);
    if (req.body?.confirm !== CONFIRM_WORD) {
      res.status(StatusCodes.BAD_REQUEST).json({ error: `Send { "confirm": "${CONFIRM_WORD}" } to restore` });
      return;
    }
    const backup = id === undefined ? undefined : await getBackup(id);
    if (!backup?.s3_key || backup.status !== "completed") {
      res.status(StatusCodes.NOT_FOUND).json({ error: "No finished backup with that ID" });
      return;
    }
    const admin: Employee = res.locals["employee"];
    const restored = await restoreBackup(backup.s3_key, admin.clerk_id);
    recordActivity(req, res, {
      module: "Backups",
      action: `Restored the database from backup #${backup.id} (${when(backup.created_at)})`,
      severity: "critical",
      flag: "Database restored from a backup",
    });
    res.status(StatusCodes.OK).json({ message: "Database restored", data: { restored } });
  } catch (error: any) {
    if (error instanceof RestoreRefusedError) {
      res.status(StatusCodes.CONFLICT).json({ error: error.message });
      return;
    }
    console.error("restoreBackupHandler failed:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      error: `Restore failed and nothing was changed: ${error?.message ?? "unknown error"}`,
    });
  }
};

export const deleteBackupHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseId(req);
    const backup = id === undefined ? undefined : await getBackup(id);
    if (!backup) {
      res.status(StatusCodes.NOT_FOUND).json({ error: "Backup not found" });
      return;
    }
    if (backup.status === "in_progress") {
      res.status(StatusCodes.CONFLICT).json({ error: "This backup is still running" });
      return;
    }
    await deleteBackup(backup.id, backup.s3_key);
    recordActivity(req, res, { module: "Backups", action: `Deleted backup #${backup.id} (${when(backup.created_at)})` });
    res.status(StatusCodes.OK).json({ message: "Backup deleted", data: { id: backup.id } });
  } catch (error: any) {
    console.error("deleteBackupHandler failed:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Failed to delete the backup" });
  }
};
