import { useEffect, useRef, useState, type FormEvent } from "react";
import { FiArchive, FiDownload, FiUploadCloud } from "react-icons/fi";
import Badge from "../components/Badge";
import Button from "../components/Button";
import Card from "../components/Card";
import { Field, Input, Select } from "../components/Field";
import Modal from "../components/Modal";
import PageHeader from "../components/PageHeader";
import { EXPORT_STATUS } from "../components/status";
import { EmptyRow, Table, Td, Th } from "../components/Table";
import Tabs from "../components/Tabs";
import { useToast } from "../components/toastContext";
import Toggle from "../components/Toggle";
import { EXPORT_DATASETS, EXPORT_JOBS } from "../data/mock";
import type { ExportFormat, ExportJob } from "../types";
import { formatDate, formatDateTime } from "../utils/format";

const FORMATS: { value: ExportFormat; label: string }[] = [
  { value: "csv", label: "CSV" },
  { value: "xlsx", label: "Excel" },
  { value: "json", label: "JSON" },
  { value: "pdf", label: "PDF" },
];

export default function DataArchive() {
  const notify = useToast();
  const [jobs, setJobs] = useState<ExportJob[]>(EXPORT_JOBS);
  const [format, setFormat] = useState<ExportFormat>("csv");
  const [autoArchive, setAutoArchive] = useState(true);
  const [archiveAfter, setArchiveAfter] = useState("12");
  const [confirmArchive, setConfirmArchive] = useState(false);
  const timers = useRef<number[]>([]);

  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), []);

  const requestExport = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const from = String(form.get("from"));
    const to = String(form.get("to"));
    if (from && to && from > to) {
      notify("The start date must be before the end date.", "error");
      return;
    }
    const range =
      from && to ? `${formatDate(from)} – ${formatDate(to)}` : from ? `Since ${formatDate(from)}` : to ? `Until ${formatDate(to)}` : "All time";
    const id = `ex-${Date.now()}`;
    setJobs((current) => [
      { id, dataset: String(form.get("dataset")), format, range, requested_at: new Date().toISOString(), status: "queued", size: null },
      ...current,
    ]);
    notify("Export started. It'll appear below when it's ready.", "info");
    timers.current.push(
      window.setTimeout(() => {
        setJobs((current) => current.map((j) => (j.id === id ? { ...j, status: "ready", size: "860 KB" } : j)));
      }, 2500),
    );
  };

  const runArchive = () => {
    setConfirmArchive(false);
    notify(`Archiving orders older than ${archiveAfter} months. You'll be notified when it's done.`, "info");
  };

  return (
    <>
      <PageHeader
        title="Archive & Export"
        description="Download system data for reporting or safekeeping, and move old records out of the live database."
      />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card title="Export data" description="Exports include everything the selected dataset holds for the date range.">
          <form onSubmit={requestExport} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Dataset" className="sm:col-span-2">
              <Select name="dataset" defaultValue={EXPORT_DATASETS[0]}>
                {EXPORT_DATASETS.map((d) => (
                  <option key={d}>{d}</option>
                ))}
              </Select>
            </Field>
            <Field label="From" hint="Leave empty for all time.">
              <Input name="from" type="date" />
            </Field>
            <Field label="To">
              <Input name="to" type="date" />
            </Field>
            <div className="sm:col-span-2">
              <p className="mb-1.5 text-xs font-medium">Format</p>
              <Tabs label="Export format" value={format} onChange={setFormat} options={FORMATS} />
            </div>
            <div className="flex justify-end sm:col-span-2">
              <Button type="submit" variant="primary" icon={FiUploadCloud}>
                Start export
              </Button>
            </div>
          </form>
        </Card>

        <Card title="Archiving" description="Archived records leave the live database but stay searchable and restorable.">
          <div className="flex flex-col gap-5">
            <Toggle
              checked={autoArchive}
              onChange={setAutoArchive}
              label="Archive old orders automatically"
              description="Runs on the 1st of every month at 2:00 AM."
            />
            <Field label="Archive orders older than">
              <Select value={archiveAfter} onChange={(e) => setArchiveAfter(e.target.value)}>
                <option value="6">6 months</option>
                <option value="12">12 months</option>
                <option value="24">2 years</option>
              </Select>
            </Field>
            <dl className="grid grid-cols-2 gap-4 rounded-xl bg-(--admin-canvas) p-4 text-sm">
              <div>
                <dt className="text-xs text-(--admin-muted)">Last archived</dt>
                <dd className="mt-0.5 font-medium">Sep 1, 2026</dd>
              </div>
              <div>
                <dt className="text-xs text-(--admin-muted)">Records in archive</dt>
                <dd className="mt-0.5 font-medium tabular-nums">48,210</dd>
              </div>
            </dl>
            <div className="flex flex-wrap justify-end gap-2">
              <Button icon={FiArchive} onClick={() => setConfirmArchive(true)}>
                Archive now
              </Button>
              <Button variant="primary" onClick={() => notify("Archive policy saved.")}>
                Save policy
              </Button>
            </div>
          </div>
        </Card>
      </div>

      <div className="mt-6">
        <Card flush title="Recent exports" description="Download links expire after 7 days">
          <Table>
            <thead>
              <tr>
                <Th>Dataset</Th>
                <Th>Range</Th>
                <Th>Format</Th>
                <Th>Requested</Th>
                <Th>Status</Th>
                <Th className="text-right">File</Th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((job) => (
                <tr key={job.id}>
                  <Td className="font-medium">{job.dataset}</Td>
                  <Td className="text-(--admin-muted)">{job.range}</Td>
                  <Td className="text-(--admin-muted) uppercase">{job.format}</Td>
                  <Td className="text-(--admin-muted)">{formatDateTime(job.requested_at)}</Td>
                  <Td>
                    <Badge tone={EXPORT_STATUS[job.status].tone} dot>{EXPORT_STATUS[job.status].label}</Badge>
                  </Td>
                  <Td className="text-right">
                    <Button
                      size="sm"
                      icon={FiDownload}
                      disabled={job.status !== "ready"}
                      onClick={() => notify("Download will start once the export API is connected.", "info")}
                    >
                      {job.size ?? "Download"}
                    </Button>
                  </Td>
                </tr>
              ))}
              {jobs.length === 0 && <EmptyRow colSpan={6}>No exports yet.</EmptyRow>}
            </tbody>
          </Table>
        </Card>
      </div>

      <Modal
        open={confirmArchive}
        onClose={() => setConfirmArchive(false)}
        size="sm"
        title="Archive old orders now?"
        description={`Orders older than ${archiveAfter} months will move to the archive. Reports that cover that period will read from the archive instead.`}
        footer={
          <>
            <Button onClick={() => setConfirmArchive(false)}>Cancel</Button>
            <Button variant="primary" onClick={runArchive}>Archive</Button>
          </>
        }
      />
    </>
  );
}
