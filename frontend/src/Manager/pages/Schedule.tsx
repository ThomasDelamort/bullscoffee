import { useState } from "react";
import { FiAlertTriangle, FiEdit2 } from "react-icons/fi";
import { useEmployees, useUpdateEmployee } from "../api/staff";
import Card from "../components/Card";
import PageHeader from "../components/PageHeader";
import { ErrorNotice, Loading } from "../components/QueryState";
import RowAction from "../components/RowAction";
import ScheduleModal from "../components/ScheduleModal";
import { useNotifyError, useToast } from "../components/toastContext";
import type { Employee } from "../types";
import { formatHours, fullName } from "../utils/format";
import {
  CLOSING,
  describeShift,
  formatClock,
  formatClockShort,
  OPENING,
  parseSchedule,
  shiftHours,
  weekdayOf,
  WEEKDAYS,
  type Shift,
} from "../utils/schedule";

/** Below this many cashiers a day is flagged as thin. */
const MIN_STAFF = 2;

export default function Schedule() {
  const notify = useToast();
  const notifyError = useNotifyError();
  const [editing, setEditing] = useState<Employee | null>(null);
  const employees = useEmployees();
  const updateEmployee = useUpdateEmployee();

  const today = weekdayOf(new Date());
  const roster = (employees.data ?? [])
    .filter((e) => e.employee_role === "cashier" && e.employee_status === "active")
    .map((e) => ({ employee: e, shift: parseSchedule(e.work_schedule) }));

  const coverage = WEEKDAYS.map((day) => {
    const shifts = roster.flatMap(({ shift }) => (shift?.days.includes(day) ? [shift] : []));
    return {
      day,
      count: shifts.length,
      opener: shifts.some((s) => s.start <= OPENING),
      closer: shifts.some((s) => s.end >= CLOSING),
    };
  });
  const gaps = coverage.filter((c) => c.count < MIN_STAFF || !c.opener || !c.closer);

  const save = (work_schedule: string) => {
    if (!editing) return;
    updateEmployee.mutate(
      { employeeId: editing.employee_id, changes: { work_schedule } },
      {
        onSuccess: () => {
          const shift = parseSchedule(work_schedule);
          notify(`${fullName(editing)} now works ${shift ? describeShift(shift) : work_schedule}.`);
          setEditing(null);
        },
        onError: notifyError,
      },
    );
  };

  return (
    <>
      <PageHeader
        title="Schedules"
        description={`Each cashier's weekly shift. The store opens at ${formatClock(OPENING)} and closes at ${formatClock(CLOSING)}.`}
      />

      {employees.error && (
        <ErrorNotice className="mb-6" title="Couldn't load the roster" error={employees.error} onRetry={() => void employees.refetch()} />
      )}

      {employees.isSuccess && gaps.length > 0 && (
        <div className="mb-6 flex items-start gap-3 rounded-2xl bg-amber-50 px-5 py-4 text-sm text-amber-900 ring-1 ring-amber-200">
          <FiAlertTriangle aria-hidden className="mt-0.5 size-5 shrink-0" />
          <ul className="space-y-0.5">
            {gaps.map((g) => (
              <li key={g.day}>
                <span className="font-semibold">{g.day}:</span>{" "}
                {[
                  g.count < MIN_STAFF && `only ${g.count} ${g.count === 1 ? "cashier" : "cashiers"}`,
                  !g.opener && "nobody in at opening",
                  !g.closer && "nobody until closing",
                ]
                  .filter(Boolean)
                  .join(", ")}
              </li>
            ))}
          </ul>
        </div>
      )}

      <Card title="Weekly roster" description="Active cashiers only" flush>
        <div className="overflow-x-auto">
          <table className="w-full min-w-max text-left text-sm">
            <thead>
              <tr>
                <th scope="col" className={HEAD}>Cashier</th>
                {WEEKDAYS.map((day) => (
                  <th key={day} scope="col" className={`${HEAD} text-center ${day === today ? "bg-(--mgr-accent)/12 text-(--mgr-ink)" : ""}`}>
                    {day}
                    {day === today && <span className="sr-only"> (today)</span>}
                  </th>
                ))}
                <th scope="col" className={`${HEAD} text-right`}>Hours / week</th>
                <th scope="col" className={HEAD}>
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {roster.map(({ employee: e, shift }) => (
                <tr key={e.employee_id} className="hover:bg-(--mgr-canvas)/50">
                  <td className={CELL}>
                    <p className="font-medium">{fullName(e)}</p>
                    {shift && (
                      <p className="text-xs text-(--mgr-muted)">
                        {formatClock(shift.start)} – {formatClock(shift.end)}
                      </p>
                    )}
                  </td>
                  {shift ? (
                    WEEKDAYS.map((day) => (
                      <td key={day} className={`${CELL} text-center ${day === today ? "bg-(--mgr-accent)/6" : ""}`}>
                        <ShiftCell shift={shift} working={shift.days.includes(day)} />
                      </td>
                    ))
                  ) : (
                    <td colSpan={WEEKDAYS.length} className={`${CELL} text-amber-800`}>
                      Can't read “{e.work_schedule}”. Edit it to set a weekly shift.
                    </td>
                  )}
                  <td className={`${CELL} text-right tabular-nums`}>
                    {shift ? formatHours(shiftHours(shift) * shift.days.length) : "—"}
                  </td>
                  <td className={`${CELL} text-right`}>
                    <RowAction icon={FiEdit2} label={`Edit ${fullName(e)}'s schedule`} onClick={() => setEditing(e)} />
                  </td>
                </tr>
              ))}
              {employees.isPending && (
                <tr>
                  <td colSpan={WEEKDAYS.length + 3}>
                    <Loading label="Loading the roster…" />
                  </td>
                </tr>
              )}
              {employees.isSuccess && roster.length === 0 && (
                <tr>
                  <td colSpan={WEEKDAYS.length + 3} className="px-5 py-10 text-center text-(--mgr-muted)">
                    No active cashiers.
                  </td>
                </tr>
              )}
            </tbody>
            <tfoot>
              <tr className="bg-(--mgr-canvas)/60">
                <th scope="row" className="px-5 py-3 text-xs font-medium tracking-wide text-(--mgr-muted) uppercase">
                  Coverage
                </th>
                {coverage.map((c) => {
                  const thin = c.count < MIN_STAFF || !c.opener || !c.closer;
                  return (
                    <td key={c.day} className={`px-3 py-3 text-center ${c.day === today ? "bg-(--mgr-accent)/12" : ""}`}>
                      <span className={`text-sm font-semibold tabular-nums ${thin ? "text-amber-700" : ""}`}>{c.count}</span>
                      {thin && (
                        <span className="block text-[11px] text-amber-700">
                          {!c.opener ? "no opener" : !c.closer ? "no closer" : "thin"}
                        </span>
                      )}
                    </td>
                  );
                })}
                <td colSpan={2} />
              </tr>
            </tfoot>
          </table>
        </div>
      </Card>

      <ScheduleModal
        key={`schedule-${editing?.employee_id ?? "closed"}`}
        employee={editing}
        onClose={() => setEditing(null)}
        onSave={save}
        saving={updateEmployee.isPending}
      />
    </>
  );
}

const HEAD =
  "border-b border-(--mgr-line) bg-(--mgr-canvas)/60 px-5 py-2.5 text-xs font-medium tracking-wide whitespace-nowrap text-(--mgr-muted) uppercase";
const CELL = "border-b border-(--mgr-line) px-3 py-3 first:px-5 whitespace-nowrap";

function ShiftCell({ shift, working }: { shift: Shift; working: boolean }) {
  if (!working) return <span className="text-xs text-(--mgr-muted)/70">Off</span>;
  return (
    <span className="inline-block rounded-md bg-(--mgr-accent)/15 px-2 py-1 text-xs font-medium text-(--mgr-ink)">
      {formatClockShort(shift.start)}–{formatClockShort(shift.end)}
    </span>
  );
}
