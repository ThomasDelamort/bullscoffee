import { useMemo, useState, type FormEvent } from "react";
import type { IconType } from "react-icons";
import { FiLock, FiLogOut, FiUnlock, FiUserCheck, FiUserPlus, FiUserX } from "react-icons/fi";
import { errorMessage } from "../../lib/api";
import { useAccountAction, useAdminUsers, useCurrentEmployee, useInviteStaff, useUpdateStaff } from "../api/users";
import Badge from "../components/Badge";
import Button from "../components/Button";
import Card from "../components/Card";
import { Field, Input, Select } from "../components/Field";
import Modal from "../components/Modal";
import PageHeader from "../components/PageHeader";
import { ErrorRow, LoadingRow } from "../components/QueryState";
import SearchInput from "../components/SearchInput";
import { ACCOUNT_STATUS } from "../components/status";
import { FOCUS_RING, INPUT_CLASS } from "../components/styles";
import { EmptyRow, Table, Td, Th } from "../components/Table";
import Tabs from "../components/Tabs";
import { useToast } from "../components/toastContext";
import { ROLE_LABELS, ROLES, STAFF_ROLES } from "../labels";
import type { AccountAction, AccountStatus, AdminUser, NewStaff, Role, StaffRole } from "../types";
import { formatDateTime, fullName, initials } from "../utils/format";

type StatusFilter = AccountStatus | "all";

/** Actions that ask first: they sign someone out, or hand over the keys. */
type Pending =
  | { kind: "sign-out" | "deactivate"; user: AdminUser }
  | { kind: "make-admin"; user: AdminUser };

const COLUMNS = 5;

export default function Users() {
  const notify = useToast();
  const users = useAdminUsers();
  const me = useCurrentEmployee();
  const accountAction = useAccountAction();
  const updateStaff = useUpdateStaff();
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<Role | "all">("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [pending, setPending] = useState<Pending | null>(null);

  const all = useMemo(() => users.data ?? [], [users.data]);
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return all.filter(
      (u) =>
        (roleFilter === "all" || u.role === roleFilter) &&
        (statusFilter === "all" || u.status === statusFilter) &&
        (!q || fullName(u).toLowerCase().includes(q) || u.email.toLowerCase().includes(q)),
    );
  }, [all, query, roleFilter, statusFilter]);

  const count = (status: AccountStatus) => all.filter((u) => u.status === status).length;
  const busyId = accountAction.isPending ? accountAction.variables.clerkId : null;

  const runAction = (user: AdminUser, action: AccountAction, done: string) =>
    accountAction.mutate(
      { clerkId: user.clerk_id, action },
      {
        onSuccess: () => notify(done),
        onError: (error) => notify(errorMessage(error), "error"),
        onSettled: () => setPending(null),
      },
    );

  const changeRole = (user: AdminUser, role: StaffRole) => {
    updateStaff.mutate(
      { employeeId: user.id, changes: { employee_role: role } },
      {
        onSuccess: () => notify(`${fullName(user)} is now ${ROLE_LABELS[role]}.`),
        onError: (error) => notify(errorMessage(error), "error"),
        onSettled: () => setPending(null),
      },
    );
  };

  const confirmPending = () => {
    if (!pending) return;
    const { kind, user } = pending;
    if (kind === "make-admin") changeRole(user, "admin");
    else if (kind === "sign-out") runAction(user, "sign-out", `${fullName(user)} is signed out everywhere.`);
    else runAction(user, "deactivate", `${fullName(user)}'s account is deactivated.`);
  };

  return (
    <>
      <PageHeader
        title="Users"
        description="Invite staff, assign roles, and lock, deactivate or sign out staff and customer accounts."
        actions={
          <Button variant="primary" icon={FiUserPlus} onClick={() => setCreateOpen(true)}>
            Invite staff
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
              { value: "all", label: "All", count: all.length },
              { value: "active", label: "Active", count: count("active") },
              { value: "invited", label: "Invited", count: count("invited") },
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
              <Th>Status</Th>
              <Th>Last active</Th>
              <Th className="text-right">Actions</Th>
            </tr>
          </thead>
          <tbody>
            {users.isPending && <LoadingRow colSpan={COLUMNS} label="Loading users…" />}
            {users.isError && <ErrorRow colSpan={COLUMNS} error={users.error} onRetry={() => void users.refetch()} />}
            {visible.map((user) => {
              // An invite from ADMIN_EMAIL has no name until its first sign-in.
              const name = fullName(user).trim() || user.email;
              const status = ACCOUNT_STATUS[user.status];
              const self = user.clerk_id === me.data?.clerk_id;
              const deactivated = user.status === "deactivated";
              const invited = user.status === "invited";
              const busy = busyId === user.clerk_id;
              return (
                <tr key={`${user.kind}-${user.id}`} className="hover:bg-(--admin-canvas)/50">
                  <Td>
                    <div className="flex items-center gap-3">
                      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-(--admin-gold)/20 text-xs font-semibold">
                        {initials(name)}
                      </span>
                      <div>
                        <p className="font-medium">
                          {name}
                          {self && <span className="ml-1.5 text-xs font-normal text-(--admin-muted)">(you)</span>}
                        </p>
                        <p className="text-xs text-(--admin-muted)">{user.email}</p>
                      </div>
                    </div>
                  </Td>
                  <Td>
                    {user.kind === "employee" ? (
                      <select
                        aria-label={`Role for ${fullName(user)}`}
                        value={user.role}
                        disabled={deactivated || self || updateStaff.isPending}
                        title={self ? "You can't change your own role" : undefined}
                        onChange={(e) => {
                          const role = e.target.value as StaffRole;
                          if (role === "admin") setPending({ kind: "make-admin", user });
                          else changeRole(user, role);
                        }}
                        className={`${INPUT_CLASS} w-44`}
                      >
                        {STAFF_ROLES.map((role) => (
                          <option key={role} value={role}>{ROLE_LABELS[role]}</option>
                        ))}
                      </select>
                    ) : (
                      <span className="text-(--admin-muted)">{ROLE_LABELS.customer}</span>
                    )}
                  </Td>
                  <Td>
                    <Badge tone={status.tone} dot>{status.label}</Badge>
                  </Td>
                  <Td className="text-(--admin-muted)">
                    {user.last_active ? formatDateTime(user.last_active) : invited ? "Not yet signed in" : "—"}
                  </Td>
                  <Td>
                    <div className="flex justify-end gap-1">
                      <RowAction
                        icon={FiLogOut}
                        label="Sign out everywhere"
                        disabled={deactivated || invited || self || busy}
                        onClick={() => setPending({ kind: "sign-out", user })}
                      />
                      <RowAction
                        icon={user.status === "locked" ? FiUnlock : FiLock}
                        label={user.status === "locked" ? "Unlock account" : "Lock account"}
                        disabled={deactivated || invited || self || busy}
                        onClick={() =>
                          user.status === "locked"
                            ? runAction(user, "unlock", `${fullName(user)}'s account is unlocked.`)
                            : runAction(user, "lock", `${fullName(user)}'s account is locked.`)
                        }
                      />
                      {deactivated ? (
                        <RowAction
                          icon={FiUserCheck}
                          label="Reactivate account"
                          disabled={busy}
                          onClick={() => runAction(user, "reactivate", `${fullName(user)}'s account is active again.`)}
                        />
                      ) : (
                        <RowAction
                          icon={FiUserX}
                          label="Deactivate account"
                          danger
                          disabled={self || busy}
                          onClick={() => setPending({ kind: "deactivate", user })}
                        />
                      )}
                    </div>
                  </Td>
                </tr>
              );
            })}
            {users.isSuccess && visible.length === 0 && (
              <EmptyRow colSpan={COLUMNS}>No users match these filters.</EmptyRow>
            )}
          </tbody>
        </Table>
      </Card>

      <InviteStaffModal open={createOpen} onClose={() => setCreateOpen(false)} />

      <Modal
        open={pending !== null}
        onClose={() => setPending(null)}
        size="sm"
        title={
          pending?.kind === "sign-out"
            ? "Sign out everywhere?"
            : pending?.kind === "make-admin"
              ? "Make this person an admin?"
              : "Deactivate account?"
        }
        description={pending && pendingDescription(pending)}
        footer={
          <>
            <Button onClick={() => setPending(null)}>Cancel</Button>
            <Button
              variant={pending?.kind === "deactivate" ? "danger" : "primary"}
              disabled={accountAction.isPending || updateStaff.isPending}
              onClick={confirmPending}
            >
              {pending?.kind === "sign-out" ? "Sign out" : pending?.kind === "make-admin" ? "Make admin" : "Deactivate"}
            </Button>
          </>
        }
      />
    </>
  );
}

function pendingDescription({ kind, user }: Pending): string {
  const name = fullName(user);
  if (kind === "sign-out") {
    return `${name} will be signed out on every device. Sign-in is handled by Clerk, so if they've forgotten their password they can use "Forgot password" on the sign-in page.`;
  }
  if (kind === "make-admin") {
    return `${name} will be able to open this console: manage users and roles, restore backups and change system settings.`;
  }
  return user.kind === "employee"
    ? `${name} won't be able to sign in or use the POS until the account is reactivated. Their order history is kept.`
    : `${name} won't be able to sign in until the account is reactivated. Their order history is kept.`;
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

function InviteStaffModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const notify = useToast();
  const invite = useInviteStaff();

  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formElement = e.currentTarget;
    const form = new FormData(formElement);
    const staff: NewStaff = {
      first_name: String(form.get("first_name")).trim(),
      last_name: String(form.get("last_name")).trim(),
      email: String(form.get("email")).trim(),
      role: String(form.get("role")) as StaffRole,
      work_schedule: String(form.get("work_schedule")).trim(),
    };
    invite.mutate(staff, {
      onSuccess: () => {
        notify(`Invite sent to ${staff.email}.`);
        formElement.reset();
        onClose();
      },
      onError: (error) => notify(errorMessage(error), "error"),
    });
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Invite staff"
      description="They'll get an email invite. Their account is linked the first time they sign in with this address."
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" type="submit" form="invite-staff-form" disabled={invite.isPending}>
            {invite.isPending ? "Sending…" : "Send invite"}
          </Button>
        </>
      }
    >
      <form id="invite-staff-form" onSubmit={submit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="First name">
          <Input name="first_name" required maxLength={50} autoComplete="off" />
        </Field>
        <Field label="Last name">
          <Input name="last_name" required maxLength={50} autoComplete="off" />
        </Field>
        <Field label="Email" className="sm:col-span-2">
          <Input name="email" type="email" required maxLength={255} autoComplete="off" />
        </Field>
        <Field label="Role">
          <Select name="role" defaultValue="cashier">
            {STAFF_ROLES.map((r) => (
              <option key={r} value={r}>{ROLE_LABELS[r]}</option>
            ))}
          </Select>
        </Field>
        <Field label="Work schedule" hint="e.g. Mon–Fri, 7 AM – 3 PM">
          <Input name="work_schedule" required maxLength={50} autoComplete="off" />
        </Field>
      </form>
    </Modal>
  );
}
