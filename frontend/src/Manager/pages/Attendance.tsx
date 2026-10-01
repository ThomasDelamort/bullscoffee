import { useMemo, useState } from "react";
import { FiAlertCircle, FiClock, FiDownload, FiLogIn, FiWatch } from "react-icons/fi";
import { useAttendance, useEmployees, useSetClockOut } from "../api/staff";
import Badge from "../components/Badge";
import Button from "../components/Button";
import Card from "../components/Card";
import { Field, Input, Select } from "../components/Field";
import Modal from "../components/Modal";
import PageHeader from "../components/PageHeader";
import { ErrorNotice, LoadingRow } from "../components/QueryState";
import RowAction from "../components/RowAction";
import StatCard from "../components/StatCard";
import { ATTENDANCE_STATE } from "../components/status";
import { EmptyRow, Table, Td, Th } from "../components/Table";
import Tabs from "../components/Tabs";
import { useNotifyError, useToast } from "../components/toastContext";
import { attendanceState, LATE_GRACE_MINUTES } from "../data/selectors";
import type { AttendanceLog } from "../types";
import { groupBy, indexBy, sumBy } from "../utils/collections";
import { downloadCsv } from "../utils/csv";
import { addDays, atTime, dayKey, fromDayKey, hoursBetween, startOfDay, timeOfDay } from "../utils/dates";
import { formatDate, formatHours, formatTime, fullName } from "../utils/format";
import { parseSchedule, worksOn } from "../utils/schedule";

type View = "logs" | "summary";

export default function Attendance() {
  const notify = useToast();
  const notifyError = useNotifyError();
  const now = new Date();
  const todayKey = dayKey(now);
  const [view, setView] = useState<View>("logs");
  const [from, setFrom] = useState(dayKey(addDays(startOfDay(now), -6)));
  const [to, setTo] = useState(todayKey);
  const [employeeFilter, setEmployeeFilter] = useState("all");
  const [fixing, setFixing] = useState<AttendanceLog | null>(null);

  const employeesQuery = useEmployees();
  const rangeQuery = useAttendance({
    from,
    to,
    employee_id: employeeFilter === "all" ? undefined : Number(employeeFilter),
  });
  // "On shift now" ignores the filters; this is the same cache entry the dashboard uses.
  const todayQuery = useAttendance({ from: todayKey, to: todayKey });
  const setClockOut = useSetClockOut();

  const allEmployees = useMemo(() => employeesQuery.data ?? [], [employeesQuery.data]);
  const employees = useMemo(() => indexBy(allEmployees, (e) => e.employee_id), [allEmployees]);
  const worked = (l: AttendanceLog) =>
    hoursBetween(l.time_in, l.time_out ?? (dayKey(l.time_in) === todayKey ? now.toISOString() : l.time_in));

  // The API returns newest first.
  const logs = rangeQuery.data ?? [];
  const states = new Map(logs.map((l) => [l.log_id, attendanceState(l, employees.get(l.employee_id), now)]));
  const onShift = (todayQuery.data ?? []).filter((l) => !l.time_out);
  const late = logs.filter((l) => states.get(l.log_id) === "late").length;
  const missed = logs.filter((l) => states.get(l.log_id) === "no-clock-out").length;

  const summary = (() => {
    const byEmployee = groupBy(logs, (l) => l.employee_id);
    const lastCounted = to < todayKey ? to : dayKey(addDays(startOfDay(now), -1));
    const days: Date[] = [];
    for (let d = fromDayKey(from); dayKey(d) <= lastCounted; d = addDays(d, 1)) days.push(d);

    return allEmployees
      .filter((e) => (employeeFilter === "all" || String(e.employee_id) === employeeFilter) && (e.employee_status === "active" || byEmployee.has(e.employee_id)))
      .map((e) => {
        const mine = byEmployee.get(e.employee_id) ?? [];
        const shift = parseSchedule(e.work_schedule);
        const loggedDays = new Set(mine.map((l) => dayKey(l.time_in)));
        const hired = dayKey(e.created_at);
        // Only days up to yesterday can be missed; today may still be ahead.
        const absences = days.filter((d) => dayKey(d) >= hired && worksOn(shift, d) && !loggedDays.has(dayKey(d))).length;
        return {
          employee: e,
          shifts: mine.length,
          hours: sumBy(mine, worked),
          late: mine.filter((l) => attendanceState(l, e, now) === "late").length,
          absences,
          rate: mine.length + absences ? Math.round((mine.length / (mine.length + absences)) * 100) : null,
        };
      })
      .sort((a, b) => fullName(a.employee).localeCompare(fullName(b.employee)));
  })();

  const exportCsv = () =>
    downloadCsv(
      `attendance-${from}-to-${to}.csv`,
      logs.map((l) => ({
        employee: l.employee_name,
        date: dayKey(l.time_in),
        time_in: formatTime(l.time_in),
        time_out: l.time_out ? formatTime(l.time_out) : "",
        hours: worked(l).toFixed(2),
        status: ATTENDANCE_STATE[states.get(l.log_id)!].label,
      })),
    );

  const saveClockOut = (log: AttendanceLog, time_out: string) =>
    setClockOut.mutate(
      { logId: log.log_id, time_out },
      {
        onSuccess: () => {
          notify(`Clock-out set for ${log.employee_name} on ${formatDate(log.time_in)}.`);
          setFixing(null);
        },
        onError: notifyError,
      },
    );

  const failed = rangeQuery.error ?? employeesQuery.error;

  return (
    <>
      <PageHeader
        title="Attendance"
        description={`Clock-ins and clock-outs by staff. Arriving more than ${LATE_GRACE_MINUTES} minutes after a scheduled start counts as late.`}
        actions={
          <Button icon={FiDownload} onClick={exportCsv} disabled={logs.length === 0}>
            Export CSV
          </Button>
        }
      />

      {failed && (
        <ErrorNotice
          className="mb-6"
          title="Couldn't load attendance"
          error={failed}
          onRetry={() => void Promise.all([rangeQuery.refetch(), employeesQuery.refetch()])}
        />
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="On shift now"
          value={onShift.length}
          hint={onShift.map((l) => employees.get(l.employee_id)?.first_name ?? l.employee_name).join(", ") || "Nobody clocked in"}
          icon={FiLogIn}
        />
        <StatCard label="Hours logged" value={formatHours(sumBy(logs, worked))} hint={`${logs.length} shifts in range`} icon={FiClock} />
        <StatCard label="Late arrivals" value={late} hint={logs.length ? `${Math.round((late / logs.length) * 100)}% of shifts` : "No shifts"} icon={FiWatch} />
        <StatCard label="Missed clock-outs" value={missed} hint={missed ? "Set them from the log below" : "All shifts closed"} icon={FiAlertCircle} />
      </div>

      <Card flush className="mt-6">
        <div className="flex flex-col gap-3 border-b border-(--mgr-line) p-4 xl:flex-row xl:items-center xl:justify-between">
          <Tabs
            label="View"
            value={view}
            onChange={setView}
            options={[
              { value: "logs", label: "Logs", count: logs.length },
              { value: "summary", label: "Summary by person" },
            ]}
          />
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Input type="date" aria-label="From" value={from} max={to} onChange={(e) => e.target.value && setFrom(e.target.value)} className="sm:w-40" />
            <span aria-hidden className="hidden text-(--mgr-muted) sm:block">–</span>
            <Input type="date" aria-label="To" value={to} min={from} max={todayKey} onChange={(e) => e.target.value && setTo(e.target.value)} className="sm:w-40" />
            <Select aria-label="Filter by employee" value={employeeFilter} onChange={(e) => setEmployeeFilter(e.target.value)} className="sm:w-48">
              <option value="all">Everyone</option>
              {allEmployees.map((e) => (
                <option key={e.employee_id} value={e.employee_id}>
                  {fullName(e)}
                  {e.employee_status === "inactive" ? " (inactive)" : ""}
                </option>
              ))}
            </Select>
          </div>
        </div>

        {view === "logs" ? (
          <Table>
            <thead>
              <tr>
                <Th>Employee</Th>
                <Th>Date</Th>
                <Th>Time in</Th>
                <Th>Time out</Th>
                <Th className="text-right">Hours</Th>
                <Th>Status</Th>
                <Th className="text-right">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {rangeQuery.isPending && <LoadingRow colSpan={7} label="Loading clock-ins…" />}
              {logs.map((l) => {
                const e = employees.get(l.employee_id);
                const state = states.get(l.log_id)!;
                const s = ATTENDANCE_STATE[state];
                return (
                  <tr key={l.log_id} className="hover:bg-(--mgr-canvas)/50">
                    <Td>
                      <p className="font-medium">{l.employee_name}</p>
                      <p className="text-xs text-(--mgr-muted) capitalize">{e?.employee_role}</p>
                    </Td>
                    <Td>{formatDate(l.time_in)}</Td>
                    <Td className="tabular-nums">{formatTime(l.time_in)}</Td>
                    <Td className="text-(--mgr-muted) tabular-nums">{l.time_out ? formatTime(l.time_out) : "—"}</Td>
                    <Td className="text-right tabular-nums">{state === "no-clock-out" ? "—" : formatHours(worked(l))}</Td>
                    <Td>
                      <Badge tone={s.tone} dot>{s.label}</Badge>
                    </Td>
                    <Td className="text-right">
                      {state === "no-clock-out" && (
                        <RowAction icon={FiClock} label="Set clock-out time" onClick={() => setFixing(l)} />
                      )}
                    </Td>
                  </tr>
                );
              })}
              {rangeQuery.isSuccess && logs.length === 0 && <EmptyRow colSpan={7}>No clock-ins in this range.</EmptyRow>}
            </tbody>
          </Table>
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Employee</Th>
                <Th className="text-right">Shifts</Th>
                <Th className="text-right">Hours</Th>
                <Th className="text-right">Late</Th>
                <Th className="text-right">Absent</Th>
                <Th className="text-right">Attendance</Th>
              </tr>
            </thead>
            <tbody>
              {summary.map((row) => (
                <tr key={row.employee.employee_id} className="hover:bg-(--mgr-canvas)/50">
                  <Td>
                    <p className="font-medium">{fullName(row.employee)}</p>
                    <p className="text-xs text-(--mgr-muted) capitalize">{row.employee.employee_role}</p>
                  </Td>
                  <Td className="text-right tabular-nums">{row.shifts}</Td>
                  <Td className="text-right tabular-nums">{formatHours(row.hours)}</Td>
                  <Td className={`text-right tabular-nums ${row.late ? "text-amber-700" : ""}`}>{row.late}</Td>
                  <Td className={`text-right tabular-nums ${row.absences ? "text-red-700" : ""}`}>{row.absences}</Td>
                  <Td className="text-right tabular-nums">{row.rate === null ? "—" : `${row.rate}%`}</Td>
                </tr>
              ))}
              {(rangeQuery.isPending || employeesQuery.isPending) && <LoadingRow colSpan={6} />}
              {rangeQuery.isSuccess && employeesQuery.isSuccess && summary.length === 0 && (
                <EmptyRow colSpan={6}>Nobody to summarise.</EmptyRow>
              )}
            </tbody>
          </Table>
        )}
      </Card>

      <ClockOutModal
        key={`clock-out-${fixing?.log_id ?? "closed"}`}
        log={fixing}
        name={fixing?.employee_name ?? ""}
        defaultEnd={fixing ? parseSchedule(employees.get(fixing.employee_id)?.work_schedule ?? "")?.end : undefined}
        saving={setClockOut.isPending}
        onClose={() => setFixing(null)}
        onSave={saveClockOut}
      />
    </>
  );
}

interface ClockOutModalProps {
  log: AttendanceLog | null;
  name: string;
  /** Scheduled end, "HH:MM", as the starting guess. */
  defaultEnd: string | undefined;
  saving: boolean;
  onClose: () => void;
  onSave: (log: AttendanceLog, timeOut: string) => void;
}

function ClockOutModal({ log, name, defaultEnd, saving, onClose, onSave }: ClockOutModalProps) {
  const [time, setTime] = useState(defaultEnd ?? (log ? timeOfDay(new Date(new Date(log.time_in).getTime() + 8 * 3_600_000).toISOString()) : ""));
  const timeOut = log && time ? atTime(dayKey(log.time_in), time) : null;
  // CHECK (time_out > time_in)
  const invalid = !log || !timeOut || new Date(timeOut) <= new Date(log.time_in);

  return (
    <Modal
      open={log !== null}
      onClose={onClose}
      size="sm"
      title="Set clock-out"
      description={log ? `${name} clocked in at ${formatTime(log.time_in)} on ${formatDate(log.time_in)} but never clocked out.` : undefined}
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" disabled={invalid || saving} onClick={() => log && timeOut && onSave(log, timeOut)}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </>
      }
    >
      <Field label="Clocked out at" hint={invalid && time ? "Must be after the clock-in time." : "Same day as the clock-in."}>
        <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
      </Field>
    </Modal>
  );
}
