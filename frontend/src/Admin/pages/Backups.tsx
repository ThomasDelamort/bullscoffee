import { useEffect, useRef, useState } from "react";
import { FiDatabase, FiDownload, FiRotateCcw, FiTrash2 } from "react-icons/fi";
import Badge from "../components/Badge";
import Button from "../components/Button";
import Card from "../components/Card";
import { Field, Input, Select } from "../components/Field";
import Modal from "../components/Modal";
import PageHeader from "../components/PageHeader";
import { BACKUP_STATUS } from "../components/status";
import { Table, Td, Th } from "../components/Table";
import { useToast } from "../components/toastContext";
import Toggle from "../components/Toggle";
import { BACKUPS } from "../data/mock";
import type { Backup } from "../types";
import { formatDateTime } from "../utils/format";

const CONFIRM_WORD = "RESTORE";

export default function Backups() {
  const notify = useToast();
  const [backups, setBackups] = useState<Backup[]>(BACKUPS);
  const [autoBackup, setAutoBackup] = useState(true);
  const [frequency, setFrequency] = useState("daily");
  const [time, setTime] = useState("03:00");
  const [retention, setRetention] = useState("30");
  const [restoring, setRestoring] = useState<Backup | null>(null);
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState<Backup | null>(null);
  const timers = useRef<number[]>([]);

  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), []);

  const inProgress = backups.some((b) => b.status === "in-progress");

  const createBackup = () => {
    const id = `bk-${Date.now()}`;
    setBackups((current) => [
      { id, created_at: new Date().toISOString(), size: "—", kind: "manual", status: "in-progress" },
      ...current,
    ]);
    notify("Backup started. This usually takes under a minute.", "info");
    timers.current.push(
      window.setTimeout(() => {
        setBackups((current) =>
          current.map((b) => (b.id === id ? { ...b, status: "completed", size: "1.84 GB" } : b)),
        );
        notify("Backup completed.");
      }, 3000),
    );
  };

  const closeRestore = () => {
    setRestoring(null);
    setConfirmText("");
  };

  const confirmRestore = () => {
    if (!restoring) return;
    notify(`Restoring from ${formatDateTime(restoring.created_at)}. The store goes read-only until it finishes.`, "info");
    closeRestore();
  };

  const confirmDelete = () => {
    if (!deleting) return;
    setBackups((current) => current.filter((b) => b.id !== deleting.id));
    notify("Backup deleted.");
    setDeleting(null);
  };

  return (
    <>
      <PageHeader
        title="Backup & Restore"
        description="Keep copies of the database and roll back to one if something goes wrong."
        actions={
          <Button variant="primary" icon={FiDatabase} disabled={inProgress} onClick={createBackup}>
            {inProgress ? "Backing up…" : "Back up now"}
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Card title="Schedule" description="Automatic backups of the PostgreSQL database">
          <div className="flex flex-col gap-5">
            <Toggle
              checked={autoBackup}
              onChange={setAutoBackup}
              label="Automatic backups"
              description="Recommended. Runs while the store is closed."
            />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
              <Field label="Frequency">
                <Select value={frequency} onChange={(e) => setFrequency(e.target.value)} disabled={!autoBackup}>
                  <option value="hourly">Every hour</option>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                </Select>
              </Field>
              <Field label="Time">
                <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} disabled={!autoBackup || frequency === "hourly"} />
              </Field>
            </div>
            <Field label="Keep backups for" hint="Older automatic backups are deleted. Manual ones are kept.">
              <Select value={retention} onChange={(e) => setRetention(e.target.value)}>
                <option value="7">7 days</option>
                <option value="30">30 days</option>
                <option value="90">90 days</option>
                <option value="365">1 year</option>
              </Select>
            </Field>
            <Button variant="primary" onClick={() => notify("Backup schedule saved.")}>
              Save schedule
            </Button>
          </div>
        </Card>

        <Card className="xl:col-span-2" flush title="Backups" description={`${backups.length} stored`}>
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
              {backups.map((backup) => {
                const ready = backup.status === "completed";
                return (
                  <tr key={backup.id}>
                    <Td>{formatDateTime(backup.created_at)}</Td>
                    <Td className="text-(--admin-muted) capitalize">{backup.kind}</Td>
                    <Td className="text-(--admin-muted) tabular-nums">{backup.size}</Td>
                    <Td>
                      <Badge tone={BACKUP_STATUS[backup.status].tone} dot>{BACKUP_STATUS[backup.status].label}</Badge>
                    </Td>
                    <Td>
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="ghost" icon={FiDownload} disabled={!ready} aria-label={`Download backup from ${formatDateTime(backup.created_at)}`} onClick={() => notify("Download will start once the backup API is connected.", "info")} />
                        <Button size="sm" icon={FiRotateCcw} disabled={!ready} onClick={() => setRestoring(backup)}>
                          Restore
                        </Button>
                        <Button size="sm" variant="ghost" icon={FiTrash2} disabled={backup.status === "in-progress"} aria-label={`Delete backup from ${formatDateTime(backup.created_at)}`} onClick={() => setDeleting(backup)} />
                      </div>
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        </Card>
      </div>

      <Modal
        open={restoring !== null}
        onClose={closeRestore}
        title="Restore this backup?"
        description={restoring && `Every change made after ${formatDateTime(restoring.created_at)} will be lost. Orders, users and settings all roll back.`}
        footer={
          <>
            <Button onClick={closeRestore}>Cancel</Button>
            <Button variant="danger" disabled={confirmText !== CONFIRM_WORD} onClick={confirmRestore}>
              Restore database
            </Button>
          </>
        }
      >
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
            <Button variant="danger" onClick={confirmDelete}>Delete</Button>
          </>
        }
      />
    </>
  );
}
