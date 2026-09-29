import { useState, type FormEvent, type ReactNode } from "react";
import type { IconType } from "react-icons";
import { FiClock, FiEdit2, FiMapPin, FiPhone, FiPlus, FiUser, FiUsers } from "react-icons/fi";
import Badge from "../components/Badge";
import Button from "../components/Button";
import { Field, Input, Select } from "../components/Field";
import Modal from "../components/Modal";
import PageHeader from "../components/PageHeader";
import { BRANCH_STATUS } from "../components/status";
import { useToast } from "../components/toastContext";
import Toggle from "../components/Toggle";
import { BRANCHES, USERS } from "../data/mock";
import type { Branch, BranchStatus } from "../types";
import { fullName } from "../utils/format";

const MANAGERS = USERS.filter((u) => u.role === "manager").map(fullName);
const UNASSIGNED = "Unassigned";

type Editing = Branch | "new" | null;

export default function Branches() {
  const notify = useToast();
  const [branches, setBranches] = useState<Branch[]>(BRANCHES);
  const [editing, setEditing] = useState<Editing>(null);

  const save = (branch: Omit<Branch, "id" | "staff_count">) => {
    if (editing === "new") {
      const id = Math.max(0, ...branches.map((b) => b.id)) + 1;
      setBranches((current) => [...current, { ...branch, id, staff_count: 0 }]);
      notify(`${branch.name} branch added.`);
    } else if (editing) {
      setBranches((current) => current.map((b) => (b.id === editing.id ? { ...b, ...branch } : b)));
      notify(`${branch.name} updated.`);
    }
    setEditing(null);
  };

  const setActive = (branch: Branch, active: boolean) => {
    setBranches((current) =>
      current.map((b) => (b.id === branch.id ? { ...b, status: active ? "open" : "inactive" } : b)),
    );
    notify(active ? `${branch.name} is active.` : `${branch.name} is deactivated and hidden from customers.`);
  };

  return (
    <>
      <PageHeader
        title="Branches"
        description="Locations customers can order from, and who runs each one."
        actions={
          <Button variant="primary" icon={FiPlus} onClick={() => setEditing("new")}>
            Add branch
          </Button>
        }
      />

      <ul className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
        {branches.map((branch) => {
          const status = BRANCH_STATUS[branch.status];
          return (
            <li
              key={branch.id}
              className={`flex flex-col rounded-2xl bg-(--admin-surface) p-5 shadow-sm ring-1 ring-(--admin-line) ${
                branch.status === "inactive" ? "opacity-75" : ""
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-base font-semibold">{branch.name}</h2>
                  <div className="mt-1.5">
                    <Badge tone={status.tone} dot>{status.label}</Badge>
                  </div>
                </div>
                <Button size="sm" variant="ghost" icon={FiEdit2} onClick={() => setEditing(branch)}>
                  Edit
                </Button>
              </div>

              <dl className="mt-5 flex flex-1 flex-col gap-2.5 text-sm">
                <Detail icon={FiMapPin} label="Address">{branch.address}</Detail>
                <Detail icon={FiUser} label="Manager">{branch.manager}</Detail>
                <Detail icon={FiClock} label="Hours">{branch.hours}</Detail>
                <Detail icon={FiPhone} label="Phone">{branch.phone}</Detail>
                <Detail icon={FiUsers} label="Staff">{branch.staff_count} staff</Detail>
              </dl>

              <div className="mt-5 border-t border-(--admin-line) pt-4">
                <Toggle
                  label="Accepting orders"
                  checked={branch.status !== "inactive"}
                  onChange={(active) => setActive(branch, active)}
                />
              </div>
            </li>
          );
        })}
      </ul>

      <BranchModal editing={editing} onClose={() => setEditing(null)} onSave={save} />
    </>
  );
}

function Detail({ icon: Icon, label, children }: { icon: IconType; label: string; children: ReactNode }) {
  return (
    <div className="flex items-start gap-2.5">
      <dt className="mt-0.5 shrink-0 text-(--admin-muted)">
        <Icon aria-hidden className="size-4" />
        <span className="sr-only">{label}</span>
      </dt>
      <dd className="min-w-0">{children}</dd>
    </div>
  );
}

interface BranchModalProps {
  editing: Editing;
  onClose: () => void;
  onSave: (branch: Omit<Branch, "id" | "staff_count">) => void;
}

function BranchModal({ editing, onClose, onSave }: BranchModalProps) {
  const branch = editing === "new" ? null : editing;

  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const text = (key: string) => String(form.get(key)).trim();
    onSave({
      name: text("name"),
      address: text("address"),
      manager: text("manager"),
      phone: text("phone"),
      hours: text("hours"),
      status: text("status") as BranchStatus,
    });
  };

  return (
    <Modal
      open={editing !== null}
      onClose={onClose}
      title={branch ? `Edit ${branch.name}` : "Add branch"}
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" type="submit" form="branch-form">
            {branch ? "Save changes" : "Add branch"}
          </Button>
        </>
      }
    >
      {/* Keyed so the uncontrolled fields reset when switching branches. */}
      <form key={branch?.id ?? "new"} id="branch-form" onSubmit={submit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Branch name" className="sm:col-span-2">
          <Input name="name" required defaultValue={branch?.name} />
        </Field>
        <Field label="Address" className="sm:col-span-2">
          <Input name="address" required defaultValue={branch?.address} />
        </Field>
        <Field label="Manager">
          <Select name="manager" defaultValue={branch?.manager ?? UNASSIGNED}>
            <option>{UNASSIGNED}</option>
            {MANAGERS.map((m) => (
              <option key={m}>{m}</option>
            ))}
          </Select>
        </Field>
        <Field label="Phone">
          <Input name="phone" type="tel" required defaultValue={branch?.phone} />
        </Field>
        <Field label="Opening hours">
          <Input name="hours" required placeholder="7:00 AM – 9:00 PM" defaultValue={branch?.hours} />
        </Field>
        <Field label="Status">
          <Select name="status" defaultValue={branch?.status ?? "open"}>
            {(Object.keys(BRANCH_STATUS) as BranchStatus[]).map((s) => (
              <option key={s} value={s}>{BRANCH_STATUS[s].label}</option>
            ))}
          </Select>
        </Field>
      </form>
    </Modal>
  );
}
