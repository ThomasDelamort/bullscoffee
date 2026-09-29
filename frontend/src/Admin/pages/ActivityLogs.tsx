import { useMemo, useState } from "react";
import { FiCheck, FiDownload, FiFlag, FiLock } from "react-icons/fi";
import { useSearchParams } from "react-router-dom";
import Badge from "../components/Badge";
import Button from "../components/Button";
import Card from "../components/Card";
import { Select } from "../components/Field";
import PageHeader from "../components/PageHeader";
import SearchInput from "../components/SearchInput";
import { SEVERITY } from "../components/status";
import { EmptyRow, Table, Td, Th } from "../components/Table";
import Tabs from "../components/Tabs";
import { useToast } from "../components/toastContext";
import { LOGS, ROLE_LABELS } from "../data/mock";
import type { LogEntry, Severity } from "../types";
import { downloadCsv } from "../utils/csv";
import { formatDateTime } from "../utils/format";

type View = "all" | "audit";

const MODULES = [...new Set(LOGS.map((l) => l.module))].sort();

export default function ActivityLogs() {
  const notify = useToast();
  const [params, setParams] = useSearchParams();
  const view: View = params.get("view") === "audit" ? "audit" : "all";
  const [logs, setLogs] = useState<LogEntry[]>(LOGS);
  const [query, setQuery] = useState("");
  const [severity, setSeverity] = useState<Severity | "all">("all");
  const [module, setModule] = useState("all");

  const flagged = logs.filter((l) => l.flag);
  const unreviewed = flagged.filter((l) => !l.flag!.reviewed).length;

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return logs.filter(
      (l) =>
        (view === "all" || l.flag) &&
        (severity === "all" || l.severity === severity) &&
        (module === "all" || l.module === module) &&
        (!q || `${l.actor} ${l.action} ${l.ip}`.toLowerCase().includes(q)),
    );
  }, [logs, view, severity, module, query]);

  const setView = (next: View) => setParams(next === "audit" ? { view: "audit" } : {}, { replace: true });

  const markReviewed = (id: number) => {
    setLogs((current) =>
      current.map((l) => (l.id === id && l.flag ? { ...l, flag: { ...l.flag, reviewed: true } } : l)),
    );
    notify("Marked as reviewed.");
  };

  const exportCsv = () => {
    downloadCsv(
      `bullscoffee-${view === "audit" ? "audit-trail" : "logs"}.csv`,
      visible.map((l) => ({
        timestamp: l.timestamp,
        actor: l.actor,
        role: l.role,
        module: l.module,
        action: l.action,
        ip: l.ip,
        severity: l.severity,
        flag: l.flag?.reason ?? "",
        reviewed: l.flag ? l.flag.reviewed : "",
      })),
    );
    notify(`Exported ${visible.length} log entries.`, "info");
  };

  return (
    <>
      <PageHeader
        title="Activity Logs"
        description="Every sign-in, change and transaction across the system. The audit trail collects events flagged as suspicious."
        actions={
          <Button icon={FiDownload} onClick={exportCsv} disabled={visible.length === 0}>
            Export CSV
          </Button>
        }
      />

      <Card flush>
        <div className="flex flex-col gap-3 border-b border-(--admin-line) p-4 lg:flex-row lg:items-center lg:justify-between">
          <Tabs
            label="Log view"
            value={view}
            onChange={setView}
            options={[
              { value: "all", label: "All logs", count: logs.length },
              { value: "audit", label: "Audit trail", count: unreviewed },
            ]}
          />
          <div className="flex flex-col gap-2 sm:flex-row">
            <SearchInput value={query} onChange={setQuery} placeholder="Search actor, action or IP" className="sm:w-64" />
            <Select aria-label="Filter by severity" value={severity} onChange={(e) => setSeverity(e.target.value as Severity | "all")} className="sm:w-36">
              <option value="all">All severities</option>
              {(Object.keys(SEVERITY) as Severity[]).map((s) => (
                <option key={s} value={s}>{SEVERITY[s].label}</option>
              ))}
            </Select>
            <Select aria-label="Filter by module" value={module} onChange={(e) => setModule(e.target.value)} className="sm:w-36">
              <option value="all">All modules</option>
              {MODULES.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </Select>
          </div>
        </div>

        <Table minWidth="min-w-[64rem]">
          <thead>
            <tr>
              <Th>Time</Th>
              <Th>Actor</Th>
              <Th>Event</Th>
              <Th>Module</Th>
              <Th>IP address</Th>
              <Th>Severity</Th>
              {view === "audit" && <Th className="text-right">Review</Th>}
            </tr>
          </thead>
          <tbody>
            {visible.map((log) => (
              <tr key={log.id} className="hover:bg-(--admin-canvas)/50">
                <Td className="text-(--admin-muted)">{formatDateTime(log.timestamp)}</Td>
                <Td>
                  <p className="font-medium">{log.actor}</p>
                  <p className="text-xs text-(--admin-muted)">
                    {log.role === "system" ? "System" : ROLE_LABELS[log.role]}
                  </p>
                </Td>
                <Td wrap className="min-w-80">
                  <p>{log.action}</p>
                  {log.flag && (
                    <p className="mt-1 flex items-center gap-1.5 text-xs text-amber-800">
                      <FiFlag aria-hidden className="size-3 shrink-0" />
                      <span className="sr-only">Flagged: </span>
                      {log.flag.reason}
                    </p>
                  )}
                </Td>
                <Td className="text-(--admin-muted)">{log.module}</Td>
                <Td className="font-mono text-xs text-(--admin-muted)">{log.ip}</Td>
                <Td>
                  <Badge tone={SEVERITY[log.severity].tone} dot>{SEVERITY[log.severity].label}</Badge>
                </Td>
                {view === "audit" && (
                  <Td>
                    <div className="flex justify-end gap-2">
                      {log.flag?.reviewed ? (
                        <Badge tone="success">Reviewed</Badge>
                      ) : (
                        <>
                          {log.role !== "system" && (
                            <Button
                              size="sm"
                              icon={FiLock}
                              aria-label={`Lock ${log.actor}'s account`}
                              onClick={() => notify(`${log.actor}'s account is locked pending review.`)}
                            >
                              Lock
                            </Button>
                          )}
                          <Button size="sm" variant="primary" icon={FiCheck} onClick={() => markReviewed(log.id)}>
                            Mark reviewed
                          </Button>
                        </>
                      )}
                    </div>
                  </Td>
                )}
              </tr>
            ))}
            {visible.length === 0 && (
              <EmptyRow colSpan={view === "audit" ? 7 : 6}>No log entries match these filters.</EmptyRow>
            )}
          </tbody>
        </Table>
      </Card>
    </>
  );
}
