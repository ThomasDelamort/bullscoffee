import { useState } from "react";
import { FiDatabase, FiDownload, FiInfo, FiRotateCcw, FiTrash2 } from "react-icons/fi";
import { errorMessage } from "../../lib/api";
import {
  useBackups,
  useCreateBackup,
  useDeleteBackup,
  useDownloadBackup,
  useRestoreBackup,
  useSaveBackupSchedule,
} from "../api/backups";
import Badge from "../components/Badge";
import Button from "../components/Button";
import Card from "../components/Card";
import { Field, Input, Select } from "../components/Field";
import Modal from "../components/Modal";
import PageHeader from "../components/PageHeader";
import { ErrorRow, LoadingRow } from "../components/QueryState";
import { JOB_STATUS } from "../components/status";
import { EmptyRow, Table, Td, Th } from "../components/Table";
import { useToast } from "../components/toastContext";
import Toggle from "../components/Toggle";
import type { Backup, BackupSchedule, BackupsResponse } from "../types";
import { formatBytes, formatDateTime, formatNumber } from "../utils/format";

const CONFIRM_WORD = "RESTORE";

export default function Backups() {
  const notify = useToast();
  const backups = useBackups();
  const create = useCreateBackup();
  const remove = useDeleteBackup();
  const restore = useRestoreBackup();
  const download = useDownloadBackup();
  const [restoring, setRestoring] = useState<Backup | null>(null);
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState<Backup | null>(null);

  const list = backups.data?.backups ?? [];
  const storage = backups.data?.storage_configured ?? true;
  const inProgress = list.some((b) => b.status === "in_progress");

  const startBackup = () =>
    create.mutate(undefined, {
      onSuccess: () => notify("Backup started. It usually takes a few seconds.", "info"),
      onError: (error) => notify(errorMessage(error), "error"),
    });

  const closeRestore = () => {
    setRestoring(null);
    setConfirmText("");
  };

  const confirmRestore = () => {
    if (!restoring) return;
    const backup = restoring;
    restore.mutate(backup.id, {
      onSuccess: ({ restored }) => {
        const rows = Object.values(restored).reduce((sum, n) => sum + n, 0);
        notify(`Restored ${formatNumber(rows)} rows from the backup of ${formatDateTime(backup.created_at)}.`);
        closeRestore();
      },
      onError: (error) => notify(errorMessage(error), "error"),
    });
  };

  const confirmDelete = () => {
    if (!deleting) return;
    remove.mutate(deleting.id, {
      onSuccess: () => notify("Backup deleted."),
      onError: (error) => notify(errorMessage(error), "error"),
      onSettled: () => setDeleting(null),
    });
  };

  return (
    <>
      <PageHeader
        title="Backup & Restore"
        description="Snapshots of the database, kept in private storage, and a way to roll back to one."
        actions={
          <Button
            variant="primary"
            icon={FiDatabase}
            disabled={inProgress || create.isPending || !storage}
            onClick={startBackup}
          >
            {inProgress ? "Backing up…" : "Back up now"}
          </Button>
        }
      />

      {!storage && (
        <div className="mb-6 flex items-start gap-3 rounded-2xl bg-sky-50 px-5 py-4 text-sm text-sky-900 ring-1 ring-sky-200">
          <FiInfo aria-hidden className="mt-0.5 size-5 shrink-0" />
          <p>
            <span className="font-semibold">Storage isn't set up.</span> Backups are kept in S3, so they need{" "}
            <code>AWS_S3_BUCKET</code> and <code>AWS_REGION</code> in the backend's environment.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        {backups.data ? (
          <ScheduleCard key={JSON.stringify(backups.data.schedule)} data={backups.data} />
        ) : (
          <Card title="Schedule">
            <p className="text-sm text-(--admin-muted)">{backups.isError ? "Couldn't load the schedule." : "Loading…"}</p>
          </Card>
        )}

        <Card className="xl:col-span-2" flush title="Backups" description={backups.data ? `${list.length} stored` : undefined}>
          <Table>
            <thead>
              <tr>
                <Th>Created</Th>
                <Th>Type</Th>
                <Th>Size</Th>
                <Th>Status</Th>
                <Th className="text-right">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {backups.isPending && <LoadingRow colSpan={5} label="Loading backups…" />}
              {backups.isError && <ErrorRow colSpan={5} error={backups.error} onRetry={() => void backups.refetch()} />}
              {list.map((backup) => {
                const ready = backup.status === "completed";
                const status = JOB_STATUS[backup.status];
                return (
                  <tr key={backup.id}>
                    <Td>
                      <p>{formatDateTime(backup.created_at)}</p>
                      {backup.created_by_name && <p className="text-xs text-(--admin-muted)">by {backup.created_by_name}</p>}
                    </Td>
                    <Td className="text-(--admin-muted) capitalize">{backup.kind}</Td>
                    <Td className="text-(--admin-muted) tabular-nums">{formatBytes(backup.size_bytes)}</Td>
                    <Td wrap>
                      <Badge tone={status.tone} dot>{status.label}</Badge>
                      {backup.error && <p className="mt-1 max-w-56 text-xs text-red-700">{backup.error}</p>}
                    </Td>
                    <Td>
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          icon={FiDownload}
                          disabled={!ready || !storage || download.isPending}
                          aria-label={`Download backup from ${formatDateTime(backup.created_at)}`}
                          onClick={() =>
                            download.mutate(backup, { onError: (error) => notify(errorMessage(error), "error") })
                          }
                        />
                        <Button size="sm" icon={FiRotateCcw} disabled={!ready || !storage} onClick={() => setRestoring(backup)}>
                          Restore
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          icon={FiTrash2}
                          disabled={backup.status === "in_progress"}
                          aria-label={`Delete backup from ${formatDateTime(backup.created_at)}`}
                          onClick={() => setDeleting(backup)}
                        />
                      </div>
                    </Td>
                  </tr>
                );
              })}
              {backups.isSuccess && list.length === 0 && <EmptyRow colSpan={5}>No backups yet.</EmptyRow>}
            </tbody>
          </Table>
        </Card>
      </div>

      <Modal
        open={restoring !== null}
        onClose={closeRestore}
        title="Restore this backup?"
        description={
          restoring &&
          `Every change made after ${formatDateTime(restoring.created_at)} will be lost: orders, staff, menu, settings and permissions all roll back. The activity log and the backup list are kept.`
        }
        footer={
          <>
            <Button onClick={closeRestore} disabled={restore.isPending}>Cancel</Button>
            <Button variant="danger" disabled={confirmText !== CONFIRM_WORD || restore.isPending} onClick={confirmRestore}>
              {restore.isPending ? "Restoring…" : "Restore database"}
            </Button>
          </>
        }
      >
        {restoring?.table_counts && (
          <p className="mb-4 text-sm text-(--admin-muted)">
            It holds{" "}
            {["orders", "customers", "employees", "products"]
              .map((t) => `${formatNumber(restoring.table_counts?.[t] ?? 0)} ${t}`)
              .join(", ")}
            .
          </p>
        )}
        <Field label={`Type ${CONFIRM_WORD} to confirm`}>
          <Input value={confirmText} onChange={(e) => setConfirmText(e.target.value)} autoComplete="off" spellCheck={false} />
        </Field>
      </Modal>

      <Modal
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        size="sm"
        title="Delete this backup?"
        description={deleting && `The backup from ${formatDateTime(deleting.created_at)} will be permanently removed.`}
        footer={
          <>
            <Button onClick={() => setDeleting(null)}>Cancel</Button>
            <Button variant="danger" disabled={remove.isPending} onClick={confirmDelete}>Delete</Button>
          </>
        }
      />
    </>
  );
}

/** Keyed on the saved schedule, so the form resets when it changes. */
function ScheduleCard({ data }: { data: BackupsResponse }) {
  const notify = useToast();
  const save = useSaveBackupSchedule();
  const [draft, setDraft] = useState<BackupSchedule>(data.schedule);
  const set = <K extends keyof BackupSchedule>(key: K, value: BackupSchedule[K]) => setDraft((d) => ({ ...d, [key]: value }));
  const dirty = JSON.stringify(draft) !== JSON.stringify(data.schedule);
  const minute = draft.backup_time.slice(3);

  return (
    <Card title="Schedule" description="Automatic backups, in store time (Asia/Manila)">
      <div className="flex flex-col gap-5">
        <Toggle
          checked={draft.backup_enabled}
          onChange={(v) => set("backup_enabled", v)}
          label="Automatic backups"
          description="Recommended. Pick a time the store is closed."
        />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
          <Field label="Frequency">
            <Select
              value={draft.backup_frequency}
              onChange={(e) => set("backup_frequency", e.target.value as BackupSchedule["backup_frequency"])}
              disabled={!draft.backup_enabled}
            >
              <option value="hourly">Every hour</option>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly (Sundays)</option>
            </Select>
          </Field>
          <Field label="Time" hint={draft.backup_frequency === "hourly" ? `At :${minute} past each hour` : undefined}>
            <Input
              type="time"
              value={draft.backup_time}
              onChange={(e) => set("backup_time", e.target.value)}
              disabled={!draft.backup_enabled}
              required
            />
          </Field>
        </div>
        <Field label="Keep backups for" hint="Older automatic backups are deleted. Manual ones are kept.">
          <Select
            value={draft.backup_retention_days}
            onChange={(e) => set("backup_retention_days", Number(e.target.value) as BackupSchedule["backup_retention_days"])}
          >
            <option value={7}>7 days</option>
            <option value={30}>30 days</option>
            <option value={90}>90 days</option>
            <option value={365}>1 year</option>
          </Select>
        </Field>
        <p className="text-xs text-(--admin-muted)">
          {data.next_run ? `Next automatic backup: ${formatDateTime(data.next_run)}.` : "Automatic backups are off."}
        </p>
        <Button
          variant="primary"
          disabled={!dirty || save.isPending || !draft.backup_time}
          onClick={() =>
            save.mutate(draft, {
              onSuccess: () => notify("Backup schedule saved."),
              onError: (error) => notify(errorMessage(error), "error"),
            })
          }
        >
          {save.isPending ? "Saving…" : "Save schedule"}
        </Button>
      </div>
    </Card>
  );
}
