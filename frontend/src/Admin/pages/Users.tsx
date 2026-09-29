import { useMemo, useState, type FormEvent } from "react";
import type { IconType } from "react-icons";
import { FiKey, FiLock, FiUnlock, FiUserCheck, FiUserPlus, FiUserX } from "react-icons/fi";
import Badge from "../components/Badge";
import Button from "../components/Button";
import Card from "../components/Card";
import { Field, Input, Select } from "../components/Field";
import Modal from "../components/Modal";
import PageHeader from "../components/PageHeader";
import SearchInput from "../components/SearchInput";
import { ACCOUNT_STATUS } from "../components/status";
import { FOCUS_RING, INPUT_CLASS } from "../components/styles";
import { EmptyRow, Table, Td, Th } from "../components/Table";
import Tabs from "../components/Tabs";
import { useToast } from "../components/toastContext";
import { BRANCH_NAMES, ROLE_LABELS, ROLES, USERS } from "../data/mock";
import type { AccountStatus, AdminUser, Role } from "../types";
import { formatDateTime, fullName, initials } from "../utils/format";

type StatusFilter = AccountStatus | "all";
type PendingAction = { kind: "reset" | "deactivate"; user: AdminUser };

/** Roles that work at a branch and so need one assigned. */
const STAFF_ROLES: readonly Role[] = ["manager", "cashier"];

export default function Users() {
  const notify = useToast();
  const [users, setUsers] = useState<AdminUser[]>(USERS);
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<Role | "all">("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [pending, setPending] = useState<PendingAction | null>(null);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return users.filter(
      (u) =>
        (roleFilter === "all" || u.role === roleFilter) &&
        (statusFilter === "all" || u.status === statusFilter) &&
        (!q || fullName(u).toLowerCase().includes(q) || u.email.toLowerCase().includes(q)),
    );
  }, [users, query, roleFilter, statusFilter]);

  const count = (status: AccountStatus) => users.filter((u) => u.status === status).length;

  const update = (id: number, patch: Partial<AdminUser>) =>
    setUsers((current) => current.map((u) => (u.id === id ? { ...u, ...patch } : u)));

  const changeRole = (user: AdminUser, role: Role) => {
    update(user.id, { role, branch: STAFF_ROLES.includes(role) ? user.branch ?? BRANCH_NAMES[0] : null });
    notify(`${fullName(user)} is now ${ROLE_LABELS[role]}.`);
  };

  const toggleLock = (user: AdminUser) => {
    const locking = user.status !== "locked";
    update(user.id, { status: locking ? "locked" : "active" });
    notify(locking ? `${fullName(user)}'s account is locked.` : `${fullName(user)}'s account is unlocked.`);
  };

  const confirmPending = () => {
    if (!pending) return;
    const { kind, user } = pending;
    if (kind === "reset") {
      notify(`Password reset link sent to ${user.email}.`);
    } else {
      update(user.id, { status: "deactivated" });
      notify(`${fullName(user)}'s account is deactivated.`);
    }
    setPending(null);
  };

  const createUser = (user: Omit<AdminUser, "id" | "status" | "last_active">) => {
    const id = Math.max(0, ...users.map((u) => u.id)) + 1;
    setUsers((current) => [
      { ...user, id, status: "active", last_active: new Date().toISOString() },
      ...current,
    ]);
    setCreateOpen(false);
    notify(`Account created. An invite was sent to ${user.email}.`);
  };

  return (
    <>
      <PageHeader
        title="Users"
        description="Create accounts, assign roles, and lock, deactivate or reset access for staff, suppliers and customers."
        actions={
          <Button variant="primary" icon={FiUserPlus} onClick={() => setCreateOpen(true)}>
            Add user
          </Button>
        }
      />

      <Card flush>
        <div className="flex flex-col gap-3 border-b border-(--admin-line) p-4 lg:flex-row lg:items-center lg:justify-between">
          <Tabs
            label="Filter by status"
            value={statusFilter}
            onChange={setStatusFilter}
            options={[
              { value: "all", label: "All", count: users.length },
              { value: "active", label: "Active", count: count("active") },
              { value: "locked", label: "Locked", count: count("locked") },
              { value: "deactivated", label: "Deactivated", count: count("deactivated") },
            ]}
          />
          <div className="flex flex-col gap-2 sm:flex-row">
            <SearchInput value={query} onChange={setQuery} placeholder="Search name or email" className="sm:w-64" />
            <Select
              aria-label="Filter by role"
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value as Role | "all")}
              className="sm:w-44"
            >
              <option value="all">All roles</option>
              {ROLES.map((role) => (
                <option key={role} value={role}>{ROLE_LABELS[role]}</option>
              ))}
            </Select>
          </div>
        </div>

        <Table>
          <thead>
            <tr>
              <Th>User</Th>
              <Th>Role</Th>
              <Th>Branch</Th>
              <Th>Status</Th>
              <Th>Last active</Th>
              <Th className="text-right">Actions</Th>
            </tr>
          </thead>
          <tbody>
            {visible.map((user) => {
              const status = ACCOUNT_STATUS[user.status];
              const deactivated = user.status === "deactivated";
              return (
                <tr key={user.id} className="hover:bg-(--admin-canvas)/50">
                  <Td>
                    <div className="flex items-center gap-3">
                      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-(--admin-gold)/20 text-xs font-semibold">
                        {initials(fullName(user))}
                      </span>
                      <div>
                        <p className="font-medium">{fullName(user)}</p>
                        <p className="text-xs text-(--admin-muted)">{user.email}</p>
                      </div>
                    </div>
                  </Td>
                  <Td>
                    <select
                      aria-label={`Role for ${fullName(user)}`}
                      value={user.role}
                      disabled={deactivated}
                      onChange={(e) => changeRole(user, e.target.value as Role)}
                      className={`${INPUT_CLASS} w-40`}
                    >
                      {ROLES.map((role) => (
                        <option key={role} value={role}>{ROLE_LABELS[role]}</option>
                      ))}
                    </select>
                  </Td>
                  <Td className="text-(--admin-muted)">{user.branch ?? "—"}</Td>
                  <Td>
                    <Badge tone={status.tone} dot>{status.label}</Badge>
                  </Td>
                  <Td className="text-(--admin-muted)">{formatDateTime(user.last_active)}</Td>
                  <Td>
                    <div className="flex justify-end gap-1">
                      <RowAction
                        icon={FiKey}
                        label="Reset password"
                        disabled={deactivated}
                        onClick={() => setPending({ kind: "reset", user })}
                      />
                      <RowAction
                        icon={user.status === "locked" ? FiUnlock : FiLock}
                        label={user.status === "locked" ? "Unlock account" : "Lock account"}
                        disabled={deactivated}
                        onClick={() => toggleLock(user)}
                      />
                      {deactivated ? (
                        <RowAction
                          icon={FiUserCheck}
                          label="Reactivate account"
                          onClick={() => {
                            update(user.id, { status: "active" });
                            notify(`${fullName(user)}'s account is active again.`);
                          }}
                        />
                      ) : (
                        <RowAction
                          icon={FiUserX}
                          label="Deactivate account"
                          danger
                          onClick={() => setPending({ kind: "deactivate", user })}
                        />
                      )}
                    </div>
                  </Td>
                </tr>
              );
            })}
            {visible.length === 0 && <EmptyRow colSpan={6}>No users match these filters.</EmptyRow>}
          </tbody>
        </Table>
      </Card>

      <CreateUserModal open={createOpen} onClose={() => setCreateOpen(false)} onCreate={createUser} />

      <Modal
        open={pending !== null}
        onClose={() => setPending(null)}
        size="sm"
        title={pending?.kind === "reset" ? "Reset password?" : "Deactivate account?"}
        description={
          pending &&
          (pending.kind === "reset"
            ? `${fullName(pending.user)} will be signed out everywhere and emailed a link to set a new password.`
            : `${fullName(pending.user)} won't be able to sign in until the account is reactivated. Their order history is kept.`)
        }
        footer={
          <>
            <Button onClick={() => setPending(null)}>Cancel</Button>
            <Button variant={pending?.kind === "reset" ? "primary" : "danger"} onClick={confirmPending}>
              {pending?.kind === "reset" ? "Send reset link" : "Deactivate"}
            </Button>
          </>
        }
      />
    </>
  );
}

interface RowActionProps {
  icon: IconType;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
}

function RowAction({ icon: Icon, label, onClick, disabled, danger }: RowActionProps) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className={`grid size-8 place-items-center rounded-lg transition-colors disabled:cursor-not-allowed disabled:opacity-30 ${FOCUS_RING} ${
        danger ? "text-red-600 hover:bg-red-50" : "text-(--admin-muted) hover:bg-(--admin-ink)/5 hover:text-(--admin-ink)"
      }`}
    >
      <Icon aria-hidden className="size-4" />
    </button>
  );
}

interface CreateUserModalProps {
  open: boolean;
  onClose: () => void;
  onCreate: (user: Omit<AdminUser, "id" | "status" | "last_active">) => void;
}

function CreateUserModal({ open, onClose, onCreate }: CreateUserModalProps) {
  const [role, setRole] = useState<Role>("cashier");
  const needsBranch = STAFF_ROLES.includes(role);

  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    onCreate({
      first_name: String(form.get("first_name")).trim(),
      last_name: String(form.get("last_name")).trim(),
      email: String(form.get("email")).trim(),
      role,
      branch: needsBranch ? String(form.get("branch")) : null,
    });
    e.currentTarget.reset();
    setRole("cashier");
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add user"
      description="They'll get an email invite to set their password."
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" type="submit" form="create-user-form">
            Create account
          </Button>
        </>
      }
    >
      <form id="create-user-form" onSubmit={submit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="First name">
          <Input name="first_name" required autoComplete="off" />
        </Field>
        <Field label="Last name">
          <Input name="last_name" required autoComplete="off" />
        </Field>
        <Field label="Email" className="sm:col-span-2">
          <Input name="email" type="email" required autoComplete="off" />
        </Field>
        <Field label="Role">
          <Select value={role} onChange={(e) => setRole(e.target.value as Role)}>
            {ROLES.map((r) => (
              <option key={r} value={r}>{ROLE_LABELS[r]}</option>
            ))}
          </Select>
        </Field>
        <Field label="Branch" hint={needsBranch ? undefined : "Only staff are assigned to a branch."}>
          <Select name="branch" disabled={!needsBranch}>
            {BRANCH_NAMES.map((b) => (
              <option key={b} value={b}>{b}</option>
            ))}
          </Select>
        </Field>
      </form>
    </Modal>
  );
}
