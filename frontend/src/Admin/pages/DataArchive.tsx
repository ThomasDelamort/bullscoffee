import { useState, type FormEvent } from "react";
import { FiDownload, FiInfo, FiUploadCloud } from "react-icons/fi";
import { errorMessage } from "../../lib/api";
import { useCreateExport, useDownloadExport, useExports } from "../api/exports";
import Badge from "../components/Badge";
import Button from "../components/Button";
import Card from "../components/Card";
import { Field, Input, Select } from "../components/Field";
import PageHeader from "../components/PageHeader";
import { ErrorRow, LoadingRow } from "../components/QueryState";
import { JOB_STATUS } from "../components/status";
import { EmptyRow, Table, Td, Th } from "../components/Table";
import Tabs from "../components/Tabs";
import { useToast } from "../components/toastContext";
import type { ExportFormat, ExportJob } from "../types";
import { formatBytes, formatDate, formatDateTime, formatNumber } from "../utils/format";

const FORMATS: { value: ExportFormat; label: string }[] = [
  { value: "csv", label: "CSV (Excel)" },
  { value: "json", label: "JSON" },
];

// Range dates are calendar days (YYYY-MM-DD); read them as local midnight,
// not UTC, so they show the same day everywhere.
const day = (date: string) => formatDate(`${date}T00:00:00`);

const rangeLabel = (job: ExportJob): string => {
  const { range_from: from, range_to: to } = job;
  if (from && to) return from === to ? day(from) : `${day(from)} – ${day(to)}`;
  if (from) return `Since ${day(from)}`;
  if (to) return `Until ${day(to)}`;
  return "All";
};

/** Exports only; the route stays /admin/archive so old links still work. */
export default function DataArchive() {
  const notify = useToast();
  const exports = useExports();
  const create = useCreateExport();
  const download = useDownloadExport();
  const [format, setFormat] = useState<ExportFormat>("csv");
  const [datasetId, setDatasetId] = useState<string>("orders");

  const datasets = exports.data?.datasets ?? [];
  const jobs = exports.data?.jobs ?? [];
  const storage = exports.data?.storage_configured ?? true;
  const dataset = datasets.find((d) => d.id === datasetId);
  const labelOf = (id: string) => datasets.find((d) => d.id === id)?.label ?? id;

  const requestExport = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const from = String(form.get("from") ?? "");
    const to = String(form.get("to") ?? "");
    if (from && to && from > to) {
      notify("The start date must be on or before the end date.", "error");
      return;
    }
    create.mutate(
      { dataset: datasetId, format, ...(dataset?.ranged && from ? { from } : {}), ...(dataset?.ranged && to ? { to } : {}) },
      {
        onSuccess: () => notify("Export started. It'll be ready below in a moment.", "info"),
        onError: (error) => notify(errorMessage(error), "error"),
      },
    );
  };

  return (
    <>
      <PageHeader
        title="Data Export"
        description="Download store data for reporting or safekeeping. Files are kept for 7 days."
      />

      {!storage && (
        <div className="mb-6 flex items-start gap-3 rounded-2xl bg-sky-50 px-5 py-4 text-sm text-sky-900 ring-1 ring-sky-200">
          <FiInfo aria-hidden className="mt-0.5 size-5 shrink-0" />
          <p>
            <span className="font-semibold">Storage isn't set up.</span> Exports are kept in S3, so they need{" "}
            <code>AWS_S3_BUCKET</code> and <code>AWS_REGION</code> in the backend's environment.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Card title="Export data" description="Times are in store time; amounts are plain numbers.">
          <form onSubmit={requestExport} className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
            <Field label="Dataset" className="sm:col-span-2 xl:col-span-1 2xl:col-span-2">
              <Select value={datasetId} onChange={(e) => setDatasetId(e.target.value)} disabled={!exports.data}>
                {datasets.map((d) => (
                  <option key={d.id} value={d.id}>{d.label}</option>
                ))}
              </Select>
            </Field>
            {dataset?.ranged ? (
              <>
                <Field label="From" hint="Leave empty for all time.">
                  <Input name="from" type="date" />
                </Field>
                <Field label="To">
                  <Input name="to" type="date" />
                </Field>
              </>
            ) : (
              <p className="text-xs text-(--admin-muted) sm:col-span-2 xl:col-span-1 2xl:col-span-2">
                {dataset ? `${dataset.label} are exported in full; there's no date range.` : ""}
              </p>
            )}
            <div className="sm:col-span-2 xl:col-span-1 2xl:col-span-2">
              <p className="mb-1.5 text-xs font-medium">Format</p>
              <Tabs label="Export format" value={format} onChange={setFormat} options={FORMATS} />
            </div>
            <div className="flex justify-end sm:col-span-2 xl:col-span-1 2xl:col-span-2">
              <Button type="submit" variant="primary" icon={FiUploadCloud} disabled={!storage || create.isPending || !dataset}>
                {create.isPending ? "Starting…" : "Start export"}
              </Button>
            </div>
          </form>
        </Card>

        <Card className="xl:col-span-2" flush title="Recent exports" description="Files are deleted after 7 days">
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
              {exports.isPending && <LoadingRow colSpan={6} label="Loading exports…" />}
              {exports.isError && <ErrorRow colSpan={6} error={exports.error} onRetry={() => void exports.refetch()} />}
              {jobs.map((job) => (
                <tr key={job.id}>
                  <Td className="font-medium">{labelOf(job.dataset)}</Td>
                  <Td className="text-(--admin-muted)">{rangeLabel(job)}</Td>
                  <Td className="text-(--admin-muted) uppercase">{job.format}</Td>
                  <Td className="text-(--admin-muted)">
                    <p>{formatDateTime(job.requested_at)}</p>
                    {job.requested_by_name && <p className="text-xs">by {job.requested_by_name}</p>}
                  </Td>
                  <Td wrap>
                    <Badge tone={JOB_STATUS[job.status].tone} dot>{JOB_STATUS[job.status].label}</Badge>
                    {job.error && <p className="mt-1 max-w-56 text-xs text-red-700">{job.error}</p>}
                  </Td>
                  <Td className="text-right">
                    <Button
                      size="sm"
                      icon={FiDownload}
                      disabled={job.status !== "completed" || download.isPending}
                      onClick={() => download.mutate(job, { onError: (error) => notify(errorMessage(error), "error") })}
                    >
                      {job.status === "completed"
                        ? `${formatNumber(job.row_count ?? 0)} rows · ${formatBytes(job.size_bytes)}`
                        : "Download"}
                    </Button>
                  </Td>
                </tr>
              ))}
              {exports.isSuccess && jobs.length === 0 && <EmptyRow colSpan={6}>No exports yet.</EmptyRow>}
            </tbody>
          </Table>
        </Card>
      </div>
    </>
  );
}
