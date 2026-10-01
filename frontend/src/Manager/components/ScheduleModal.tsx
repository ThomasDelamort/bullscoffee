import { useState } from "react";
import type { Employee } from "../types";
import { formatHours, fullName } from "../utils/format";
import {
  DEFAULT_SHIFT,
  describeShift,
  formatSchedule,
  parseSchedule,
  shiftHours,
  shiftProblem,
  WEEKDAYS,
  type Shift,
} from "../utils/schedule";
import Button from "./Button";
import { Field, Input } from "./Field";
import Modal from "./Modal";
import { FOCUS_RING } from "./styles";

const PRESETS: { label: string; start: string; end: string }[] = [
  { label: "Opening", start: "07:00", end: "15:00" },
  { label: "Mid", start: "10:00", end: "18:00" },
  { label: "Closing", start: "13:00", end: "21:00" },
];

interface ShiftFieldsProps {
  value: Shift;
  onChange: (shift: Shift) => void;
}

/** Working days + start/end time; everything work_schedule can express. */
export function ShiftFields({ value, onChange }: ShiftFieldsProps) {
  const toggleDay = (day: Shift["days"][number]) =>
    onChange({
      ...value,
      days: value.days.includes(day) ? value.days.filter((d) => d !== day) : WEEKDAYS.filter((d) => d === day || value.days.includes(d)),
    });

  return (
    <div className="space-y-4">
      <fieldset>
        <legend className="mb-1.5 text-xs font-medium">Working days</legend>
        <div className="flex flex-wrap gap-1.5">
          {WEEKDAYS.map((day) => {
            const on = value.days.includes(day);
            return (
              <button
                key={day}
                type="button"
                aria-pressed={on}
                onClick={() => toggleDay(day)}
                className={`w-12 rounded-lg py-1.5 text-sm font-medium ring-1 ring-inset ${FOCUS_RING} ${
                  on
                    ? "bg-(--mgr-ink) text-(--mgr-cream) ring-(--mgr-ink)"
                    : "bg-(--mgr-surface) text-(--mgr-muted) ring-(--mgr-line) hover:text-(--mgr-ink)"
                }`}
              >
                {day}
              </button>
            );
          })}
        </div>
      </fieldset>

      <div className="flex flex-wrap items-end gap-3">
        <Field label="Starts" className="w-32">
          <Input type="time" required value={value.start} onChange={(e) => onChange({ ...value, start: e.target.value })} />
        </Field>
        <Field label="Ends" className="w-32">
          <Input type="time" required value={value.end} onChange={(e) => onChange({ ...value, end: e.target.value })} />
        </Field>
        <div className="flex gap-1">
          {PRESETS.map((p) => (
            <Button key={p.label} size="sm" variant="ghost" onClick={() => onChange({ ...value, start: p.start, end: p.end })}>
              {p.label}
            </Button>
          ))}
        </div>
      </div>

      {!shiftProblem(value) && (
        <p className="text-xs text-(--mgr-muted)">
          {describeShift(value)} · {formatHours(shiftHours(value) * value.days.length)} a week
        </p>
      )}
    </div>
  );
}

interface ScheduleModalProps {
  employee: Employee | null;
  onClose: () => void;
  onSave: (workSchedule: string) => void;
  saving?: boolean;
}

export default function ScheduleModal({ employee, onClose, onSave, saving = false }: ScheduleModalProps) {
  const current = employee ? parseSchedule(employee.work_schedule) : null;
  const [shift, setShift] = useState<Shift>(current ?? DEFAULT_SHIFT);
  const [touched, setTouched] = useState(false);
  const problem = shiftProblem(shift);

  return (
    <Modal
      open={employee !== null}
      onClose={onClose}
      title={employee ? `${fullName(employee)}'s schedule` : ""}
      description="One shift pattern repeats every week."
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button
            variant="primary"
            disabled={saving}
            onClick={() => {
              setTouched(true);
              if (!problem) onSave(formatSchedule(shift));
            }}
          >
            {saving ? "Saving…" : "Save schedule"}
          </Button>
        </>
      }
    >
      {employee && !current && (
        <p className="mb-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900 ring-1 ring-amber-200">
          The saved schedule “{employee.work_schedule}” isn't in a format this screen can read. Saving replaces it.
        </p>
      )}
      <ShiftFields value={shift} onChange={setShift} />
      {touched && problem && (
        <p role="alert" className="mt-3 text-sm text-red-700">
          {problem}
        </p>
      )}
    </Modal>
  );
}
