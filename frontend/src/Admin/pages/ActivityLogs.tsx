import { useState } from "react";
import { FiCheck, FiDownload, FiFlag, FiLock } from "react-icons/fi";
import { useSearchParams } from "react-router-dom";
import { errorMessage } from "../../lib/api";
import { useActivity, useActivityModules, useReviewActivity } from "../api/activity";
import { useAccountAction, useCurrentEmployee } from "../api/users";
import Badge from "../components/Badge";
import Button from "../components/Button";
import Card from "../components/Card";
import { Select } from "../components/Field";
import PageHeader from "../components/PageHeader";
import { ErrorRow, LoadingRow } from "../components/QueryState";
import SearchInput from "../components/SearchInput";
import { SEVERITY } from "../components/status";
import { EmptyRow, Table, Td, Th } from "../components/Table";
import Tabs from "../components/Tabs";
import { useToast } from "../components/toastContext";
import { ROLE_LABELS } from "../labels";
import type { ActivityFilters, LogEntry, Severity } from "../types";
import { downloadCsv } from "../utils/csv";
import { formatDateTime } from "../utils/format";
import { useDebouncedValue } from "../utils/useDebouncedValue";

type View = NonNullable<ActivityFilters["view"]>;

export default function ActivityLogs() {
  const notify = useToast();
  const [params, setParams] = useSearchParams();
  const view: View = params.get("view") === "audit" ? "audit" : "all";
  const [query, setQuery] = useState("");
  const [severity, setSeverity] = useState<Severity | "all">("all");
  const [module, setModule] = useState("all");
  const search = useDebouncedValue(query.trim());

  const filters: ActivityFilters = {
    view,
    ...(severity !== "all" && { severity }),
    ...(module !== "all" && { module }),
    ...(search && { search }),
  };
  const activity = useActivity(filters);
  const modules = useActivityModules();
  const review = useReviewActivity();
  const accountAction = useAccountAction();
  const me = useCurrentEmployee();

  const logs = activity.data?.pages.flatMap((page) => page.entries) ?? [];
  const unreviewed = activity.data?.pages[0]?.unreviewed;
  const columns = view === "audit" ? 7 : 6;

  const setView = (next: View) => setParams(next === "audit" ? { view: "audit" } : {}, { replace: true });

  const markReviewed = (log: LogEntry) =>
    review.mutate(log.id, {
      onSuccess: () => notify("Marked as reviewed."),
      onError: (error) => notify(errorMessage(error), "error"),
    });

  // Locks the actor's Clerk account from the flagged row; they're shown as
  // Locked on the Users page, where they can be unlocked again.
  const lockActor = (log: LogEntry) => {
    if (!log.actor_clerk_id) return;
    accountAction.mutate(
      { clerkId: log.actor_clerk_id, action: "lock" },
      {
        onSuccess: () => notify(`${log.actor}'s account is locked pending review.`),
        onError: (error) => notify(errorMessage(error), "error"),
      },
    );
  };

  const exportCsv = () => {
    downloadCsv(
      `bullscoffee-${view === "audit" ? "audit-trail" : "logs"}.csv`,
      logs.map((l) => ({
        timestamp: l.timestamp,
        actor: l.actor,
        role: l.role,
        module: l.module,
        action: l.action,
        ip: l.ip,
        severity: l.severity,
        flag: l.flag?.reason ?? "",
        reviewed_at: l.flag?.reviewed_at ?? "",
        reviewed_by: l.flag?.reviewed_by ?? "",
      })),
    );
    notify(`Exported ${logs.length} log entries.`, "info");
  };

  return (
    <>
      <PageHeader
        title="Activity Logs"
        description="Sign-ins and changes across the system. The audit trail collects events flagged as suspicious until someone reviews them."
        actions={
          <Button icon={FiDownload} onClick={exportCsv} disabled={logs.length === 0}>
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
              { value: "all", label: "All logs" },
              { value: "audit", label: "Audit trail", ...(unreviewed !== undefined && { count: unreviewed }) },
            ]}
          />
          <div className="flex flex-col gap-2 sm:flex-row">
            <SearchInput value={query} onChange={setQuery} placeholder="Search actor, action or IP" className="sm:w-64" />
            <Select
              aria-label="Filter by severity"
              value={severity}
              onChange={(e) => setSeverity(e.target.value as Severity | "all")}
              className="sm:w-36"
            >
              <option value="all">All severities</option>
              {(Object.keys(SEVERITY) as Severity[]).map((s) => (
                <option key={s} value={s}>{SEVERITY[s].label}</option>
              ))}
            </Select>
            <Select aria-label="Filter by module" value={module} onChange={(e) => setModule(e.target.value)} className="sm:w-36">
              <option value="all">All modules</option>
              {(modules.data ?? []).map((m) => (
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
            {activity.isPending && <LoadingRow colSpan={columns} label="Loading activity…" />}
            {activity.isError && (
              <ErrorRow colSpan={columns} error={activity.error} onRetry={() => void activity.refetch()} />
            )}
            {logs.map((log) => (
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
                <Td className="font-mono text-xs text-(--admin-muted)">{log.ip ?? "—"}</Td>
                <Td>
                  <Badge tone={SEVERITY[log.severity].tone} dot>{SEVERITY[log.severity].label}</Badge>
                </Td>
                {view === "audit" && (
                  <Td>
                    <div className="flex justify-end gap-2">
                      {log.flag?.reviewed_at ? (
                        <span title={log.flag.reviewed_by ? `By ${log.flag.reviewed_by}` : undefined}>
                          <Badge tone="success">Reviewed</Badge>
                        </span>
                      ) : (
                        <>
                          {log.actor_clerk_id && log.actor_clerk_id !== me.data?.clerk_id && (
                            <Button
                              size="sm"
                              icon={FiLock}
                              aria-label={`Lock ${log.actor}'s account`}
                              disabled={accountAction.isPending}
                              onClick={() => lockActor(log)}
                            >
                              Lock
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="primary"
                            icon={FiCheck}
                            disabled={review.isPending && review.variables === log.id}
                            onClick={() => markReviewed(log)}
                          >
                            Mark reviewed
                          </Button>
                        </>
                      )}
                    </div>
                  </Td>
                )}
              </tr>
            ))}
            {activity.isSuccess && logs.length === 0 && (
              <EmptyRow colSpan={columns}>
                {view === "audit" ? "Nothing has been flagged." : "No log entries match these filters."}
              </EmptyRow>
            )}
          </tbody>
        </Table>
        {activity.hasNextPage && (
          <div className="flex justify-center border-t border-(--admin-line) p-4">
            <Button onClick={() => void activity.fetchNextPage()} disabled={activity.isFetchingNextPage}>
              {activity.isFetchingNextPage ? "Loading…" : "Load more"}
            </Button>
          </div>
        )}
      </Card>
    </>
  );
}
