import { useState, type FormEvent } from "react";
import { FiEdit2, FiUserCheck, FiUserPlus, FiUserX } from "react-icons/fi";
import Badge from "../components/Badge";
import Button from "../components/Button";
import Card from "../components/Card";
import { Field, Input } from "../components/Field";
import Modal from "../components/Modal";
import PageHeader from "../components/PageHeader";
import RowAction from "../components/RowAction";
import { ShiftFields } from "../components/ScheduleModal";
import SearchInput from "../components/SearchInput";
import { EMPLOYEE_STATUS } from "../components/status";
import { EmptyRow, Table, Td, Th } from "../components/Table";
import Tabs from "../components/Tabs";
import { useToast } from "../components/toastContext";
import { useManagerData } from "../data/dataContext";
import type { Employee, EmployeeStatus } from "../types";
import { nextId } from "../utils/collections";
import { dayKey } from "../utils/dates";
import { formatDate, formatTime, fullName, initials } from "../utils/format";
import {
  DEFAULT_SHIFT,
  describeShift,
  formatSchedule,
  parseSchedule,
  shiftProblem,
  worksOn,
  type Shift,
} from "../utils/schedule";

type StatusFilter = EmployeeStatus | "all";
type CashierForm = Pick<Employee, "first_name" | "last_name" | "employee_email" | "contact_number" | "work_schedule">;

export default function Staff() {
  const { db, update } = useManagerData();
  const notify = useToast();
  const [status, setStatus] = useState<StatusFilter>("active");
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<Employee | "new" | null>(null);
  const [deactivating, setDeactivating] = useState<Employee | null>(null);

  const now = new Date();
  const today = dayKey(now);
  const cashiers = db.employees.filter((e) => e.employee_role === "cashier");
  const count = (s: EmployeeStatus) => cashiers.filter((e) => e.employee_status === s).length;
  const visible = cashiers.filter((e) => {
    const q = query.trim().toLowerCase();
    return (
      (status === "all" || e.employee_status === status) &&
      (!q || fullName(e).toLowerCase().includes(q) || e.employee_email.toLowerCase().includes(q))
    );
  });

  const openLog = (e: Employee) =>
    db.attendance_logs.find((l) => l.employee_id === e.employee_id && !l.time_out && dayKey(l.time_in) === today);

  const setStatusOf = (e: Employee, employee_status: EmployeeStatus) =>
    update("employees", (rows) => rows.map((x) => (x.employee_id === e.employee_id ? { ...x, employee_status } : x)));

  const save = (form: CashierForm) => {
    if (editing === "new") {
      update("employees", (rows) => [
        ...rows,
        {
          ...form,
          employee_id: nextId(rows, (e) => e.employee_id),
          // Replaced by the real Clerk user id once they accept the invite.
          clerk_id: `invite_${Date.now()}`,
          profile_picture: null,
          employee_status: "active",
          employee_role: "cashier",
          created_at: new Date().toISOString(),
        },
      ]);
      notify(`${form.first_name} was added. An invite was sent to ${form.employee_email}.`);
    } else if (editing) {
      update("employees", (rows) => rows.map((e) => (e.employee_id === editing.employee_id ? { ...e, ...form } : e)));
      notify(`${form.first_name} ${form.last_name}'s details were updated.`);
    }
    setEditing(null);
  };

  const confirmDeactivate = () => {
    if (!deactivating) return;
    setStatusOf(deactivating, "inactive");
    notify(`${fullName(deactivating)} was deactivated.`);
    setDeactivating(null);
  };

  return (
    <>
      <PageHeader
        title="Cashiers"
        description="Add cashiers, keep their details current and deactivate those who've left. Their order and attendance history is always kept."
        actions={
          <Button variant="primary" icon={FiUserPlus} onClick={() => setEditing("new")}>
            Add cashier
          </Button>
        }
      />

      <Card flush>
        <div className="flex flex-col gap-3 border-b border-(--mgr-line) p-4 lg:flex-row lg:items-center lg:justify-between">
          <Tabs
            label="Filter by status"
            value={status}
            onChange={setStatus}
            options={[
              { value: "active", label: "Active", count: count("active") },
              { value: "inactive", label: "Inactive", count: count("inactive") },
              { value: "all", label: "All", count: cashiers.length },
            ]}
          />
          <SearchInput value={query} onChange={setQuery} placeholder="Search name or email" className="lg:w-64" />
        </div>

        <Table>
          <thead>
            <tr>
              <Th>Cashier</Th>
              <Th>Contact</Th>
              <Th>Schedule</Th>
              <Th>Right now</Th>
              <Th>Status</Th>
              <Th className="text-right">Actions</Th>
            </tr>
          </thead>
          <tbody>
            {visible.map((e) => {
              const shift = parseSchedule(e.work_schedule);
              const log = openLog(e);
              const active = e.employee_status === "active";
              const s = EMPLOYEE_STATUS[e.employee_status];
              return (
                <tr key={e.employee_id} className="hover:bg-(--mgr-canvas)/50">
                  <Td>
                    <div className="flex items-center gap-3">
                      {e.profile_picture ? (
                        <img src={e.profile_picture} alt="" className="size-9 shrink-0 rounded-full object-cover" />
                      ) : (
                        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-(--mgr-accent)/15 text-xs font-semibold">
                          {initials(fullName(e))}
                        </span>
                      )}
                      <div>
                        <p className="font-medium">{fullName(e)}</p>
                        <p className="text-xs text-(--mgr-muted)">{e.employee_email}</p>
                      </div>
                    </div>
                  </Td>
                  <Td className="text-(--mgr-muted)">{e.contact_number ?? "—"}</Td>
                  <Td className="text-(--mgr-muted)">{shift ? describeShift(shift) : e.work_schedule}</Td>
                  <Td>
                    {!active ? (
                      <span className="text-(--mgr-muted)">—</span>
                    ) : log ? (
                      <Badge tone="success" dot>On shift since {formatTime(log.time_in)}</Badge>
                    ) : worksOn(shift, now) ? (
                      <Badge tone="neutral">Scheduled today</Badge>
                    ) : (
                      <span className="text-(--mgr-muted)">Day off</span>
                    )}
                  </Td>
                  <Td>
                    <Badge tone={s.tone} dot>{s.label}</Badge>
                    <span className="mt-0.5 block text-xs text-(--mgr-muted)">Since {formatDate(e.created_at)}</span>
                  </Td>
                  <Td>
                    <div className="flex justify-end gap-1">
                      <RowAction icon={FiEdit2} label={`Edit ${fullName(e)}`} onClick={() => setEditing(e)} />
                      {active ? (
                        <RowAction icon={FiUserX} label={`Deactivate ${fullName(e)}`} danger onClick={() => setDeactivating(e)} />
                      ) : (
                        <RowAction
                          icon={FiUserCheck}
                          label={`Reactivate ${fullName(e)}`}
                          onClick={() => {
                            setStatusOf(e, "active");
                            notify(`${fullName(e)} is active again.`);
                          }}
                        />
                      )}
                    </div>
                  </Td>
                </tr>
              );
            })}
            {visible.length === 0 && <EmptyRow colSpan={6}>No cashiers match these filters.</EmptyRow>}
          </tbody>
        </Table>
      </Card>

      <CashierModal
        key={`cashier-${editing === null ? "closed" : editing === "new" ? "new" : editing.employee_id}`}
        cashier={editing}
        onClose={() => setEditing(null)}
        onSave={save}
      />

      <Modal
        open={deactivating !== null}
        onClose={() => setDeactivating(null)}
        size="sm"
        title={`Deactivate ${deactivating ? fullName(deactivating) : ""}?`}
        description={
          deactivating && openLog(deactivating)
            ? "They're clocked in right now. Once deactivated they can't sign in or clock in again. Their history is kept."
            : "They won't be able to sign in or clock in. Their order and attendance history is kept, and you can reactivate them later."
        }
        footer={
          <>
            <Button onClick={() => setDeactivating(null)}>Cancel</Button>
            <Button variant="danger" onClick={confirmDeactivate}>
              Deactivate
            </Button>
          </>
        }
      />
    </>
  );
}

interface CashierModalProps {
  cashier: Employee | "new" | null;
  onClose: () => void;
  onSave: (form: CashierForm) => void;
}

function CashierModal({ cashier, onClose, onSave }: CashierModalProps) {
  const { db } = useManagerData();
  const existing = cashier === "new" ? null : cashier;
  const [shift, setShift] = useState<Shift>((existing && parseSchedule(existing.work_schedule)) ?? DEFAULT_SHIFT);
  const [error, setError] = useState<string | null>(null);

  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const email = String(form.get("employee_email")).trim().toLowerCase();
    const taken = db.employees.some((x) => x.employee_email.toLowerCase() === email && x.employee_id !== existing?.employee_id);
    if (taken) return setError("Another employee already uses that email.");
    const problem = shiftProblem(shift);
    if (problem) return setError(problem);
    onSave({
      first_name: String(form.get("first_name")).trim(),
      last_name: String(form.get("last_name")).trim(),
      employee_email: email,
      contact_number: String(form.get("contact_number")).trim() || null,
      work_schedule: formatSchedule(shift),
    });
  };

  return (
    <Modal
      open={cashier !== null}
      onClose={onClose}
      size="lg"
      title={existing ? `Edit ${fullName(existing)}` : "Add cashier"}
      description={existing ? undefined : "They'll get an email invite to set up their sign-in."}
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" type="submit" form="cashier-form">
            {existing ? "Save changes" : "Add cashier"}
          </Button>
        </>
      }
    >
      <form id="cashier-form" onSubmit={submit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="First name">
          <Input name="first_name" required maxLength={50} defaultValue={existing?.first_name} autoComplete="off" />
        </Field>
        <Field label="Last name">
          <Input name="last_name" required maxLength={50} defaultValue={existing?.last_name} autoComplete="off" />
        </Field>
        <Field label="Email">
          <Input
            name="employee_email"
            type="email"
            required
            maxLength={255}
            defaultValue={existing?.employee_email}
            autoComplete="off"
          />
        </Field>
        <Field label="Contact number" hint="Optional">
          <Input name="contact_number" type="tel" maxLength={20} defaultValue={existing?.contact_number ?? ""} autoComplete="off" />
        </Field>
        <div className="border-t border-(--mgr-line) pt-4 sm:col-span-2">
          <p className="mb-3 text-sm font-semibold">Weekly schedule</p>
          <ShiftFields value={shift} onChange={setShift} />
        </div>
        {error && (
          <p role="alert" className="text-sm text-red-700 sm:col-span-2">
            {error}
          </p>
        )}
      </form>
    </Modal>
  );
}
