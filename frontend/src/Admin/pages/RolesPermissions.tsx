import { useMemo, useState } from "react";
import { FiLock, FiRotateCcw, FiSave } from "react-icons/fi";
import { errorMessage } from "../../lib/api";
import { usePermissions, useSavePermissions } from "../api/permissions";
import { useAdminUsers } from "../api/users";
import Button from "../components/Button";
import Card from "../components/Card";
import PageHeader from "../components/PageHeader";
import { ErrorNotice, Loading } from "../components/QueryState";
import { useToast } from "../components/toastContext";
import { ROLE_LABELS, STAFF_ROLES } from "../labels";
import type { EditableRole, Permission, PermissionMatrix, StaffRole } from "../types";

const EDITABLE: readonly EditableRole[] = ["manager", "cashier"];

const sameGrants = (a: string[], b: string[]) => a.length === b.length && a.every((id) => b.includes(id));

export default function RolesPermissions() {
  const notify = useToast();
  const permissions = usePermissions();
  const save = useSavePermissions();
  const users = useAdminUsers();
  // null: no unsaved edits, so the matrix shows what's saved.
  const [draft, setDraft] = useState<PermissionMatrix | null>(null);

  const saved = permissions.data?.matrix;
  const current = draft ?? saved;
  const catalogue = permissions.data?.catalogue;

  const modules = useMemo(() => {
    const groups = new Map<string, Permission[]>();
    for (const p of catalogue ?? []) groups.set(p.module, [...(groups.get(p.module) ?? []), p]);
    return [...groups];
  }, [catalogue]);

  const dirty = Boolean(draft && saved && EDITABLE.some((role) => !sameGrants(draft[role], saved[role])));
  const grantable = catalogue?.filter((p) => !p.admin_only).length ?? 0;

  const toggle = (role: EditableRole, permissionId: string) => {
    if (!current) return;
    const has = current[role].includes(permissionId);
    setDraft({
      ...current,
      [role]: has ? current[role].filter((id) => id !== permissionId) : [...current[role], permissionId],
    });
  };

  const submit = () => {
    if (!draft) return;
    save.mutate(draft, {
      onSuccess: () => {
        setDraft(null);
        notify("Permissions saved. They apply from each person's next request.");
      },
      onError: (error) => notify(errorMessage(error), "error"),
    });
  };

  const holds = (role: StaffRole, permission: Permission) =>
    role === "admin" || (!permission.admin_only && Boolean(current?.[role].includes(permission.id)));

  return (
    <>
      <PageHeader
        title="Roles & Permissions"
        description="Decide what managers and cashiers can do. The API checks these on every request. Assign a role to a person on the Users page."
        actions={
          <>
            <Button icon={FiRotateCcw} disabled={!dirty || save.isPending} onClick={() => setDraft(null)}>
              Discard
            </Button>
            <Button variant="primary" icon={FiSave} disabled={!dirty || save.isPending} onClick={submit}>
              {save.isPending ? "Saving…" : "Save changes"}
            </Button>
          </>
        }
      />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {STAFF_ROLES.map((role) => (
          <div key={role} className="rounded-2xl bg-(--admin-surface) p-4 shadow-sm ring-1 ring-(--admin-line)">
            <p className="flex items-center gap-1.5 text-sm font-semibold">
              {ROLE_LABELS[role]}
              {role === "admin" && <FiLock aria-label="Locked" className="size-3.5 text-(--admin-muted)" />}
            </p>
            <p className="mt-2 text-xs text-(--admin-muted)">
              <span className="font-medium text-(--admin-ink) tabular-nums">
                {users.data ? users.data.filter((u) => u.role === role).length : "–"}
              </span>{" "}
              users ·{" "}
              {role === "admin" ? (
                "every permission"
              ) : (
                <>
                  <span className="font-medium text-(--admin-ink) tabular-nums">
                    {current ? current[role].length : "–"}
                  </span>{" "}
                  of {grantable} permissions
                </>
              )}
            </p>
          </div>
        ))}
      </div>

      <Card flush title="Permission matrix" description="Admins hold every permission. System permissions are for admins only.">
        {permissions.isPending && <Loading label="Loading permissions…" />}
        {permissions.isError && (
          <div className="p-4">
            <ErrorNotice error={permissions.error} onRetry={() => void permissions.refetch()} />
          </div>
        )}
        {current && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-160 text-sm">
              <thead>
                <tr className="bg-(--admin-canvas)/60">
                  <th scope="col" className="px-5 py-3 text-left text-xs font-medium tracking-wide text-(--admin-muted) uppercase">
                    Permission
                  </th>
                  {STAFF_ROLES.map((role) => (
                    <th key={role} scope="col" className="w-32 px-3 py-3 text-center text-xs font-medium">
                      {ROLE_LABELS[role]}
                    </th>
                  ))}
                </tr>
              </thead>
              {modules.map(([module, list]) => (
                <tbody key={module}>
                  <tr>
                    <th
                      scope="colgroup"
                      colSpan={STAFF_ROLES.length + 1}
                      className="border-t border-(--admin-line) bg-(--admin-canvas)/30 px-5 pt-4 pb-2 text-left text-xs font-semibold tracking-wide uppercase"
                    >
                      {module}
                    </th>
                  </tr>
                  {list.map((permission) => (
                    <tr key={permission.id} className="border-t border-(--admin-line) hover:bg-(--admin-canvas)/40">
                      <th scope="row" className="px-5 py-2.5 text-left font-normal">
                        <span className="block">{permission.label}</span>
                        <span className="block text-xs text-(--admin-muted)">
                          {permission.admin_only ? "Admin console only" : permission.gates}
                        </span>
                      </th>
                      {STAFF_ROLES.map((role) => (
                        <td key={role} className="px-3 py-2.5 text-center">
                          <input
                            type="checkbox"
                            aria-label={`${ROLE_LABELS[role]}: ${permission.label}`}
                            checked={holds(role, permission)}
                            disabled={role === "admin" || permission.admin_only || save.isPending}
                            onChange={() => role !== "admin" && toggle(role, permission.id)}
                            className="size-4 cursor-pointer accent-(--admin-ink) disabled:cursor-not-allowed disabled:opacity-60"
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              ))}
            </table>
          </div>
        )}
      </Card>
    </>
  );
}
