import { useMemo, useState } from "react";
import { FiLock, FiRotateCcw, FiSave } from "react-icons/fi";
import Button from "../components/Button";
import Card from "../components/Card";
import PageHeader from "../components/PageHeader";
import { useToast } from "../components/toastContext";
import { DEFAULT_PERMISSIONS, PERMISSIONS, ROLE_LABELS, ROLES, USERS } from "../data/mock";
import type { Permission, PermissionMatrix, Role } from "../types";

/** Admin always keeps every permission so nobody can lock themselves out. */
const LOCKED_ROLE: Role = "admin";

export default function RolesPermissions() {
  const notify = useToast();
  const [saved, setSaved] = useState<PermissionMatrix>(DEFAULT_PERMISSIONS);
  const [draft, setDraft] = useState<PermissionMatrix>(DEFAULT_PERMISSIONS);

  const modules = useMemo(() => {
    const groups = new Map<string, Permission[]>();
    for (const p of PERMISSIONS) groups.set(p.module, [...(groups.get(p.module) ?? []), p]);
    return [...groups];
  }, []);

  const dirty = ROLES.some(
    (role) =>
      draft[role].length !== saved[role].length || draft[role].some((id) => !saved[role].includes(id)),
  );

  const toggle = (role: Role, permissionId: string) => {
    setDraft((current) => {
      const has = current[role].includes(permissionId);
      return {
        ...current,
        [role]: has ? current[role].filter((id) => id !== permissionId) : [...current[role], permissionId],
      };
    });
  };

  const save = () => {
    setSaved(draft);
    notify("Permissions updated. Changes apply at each user's next sign-in.");
  };

  return (
    <>
      <PageHeader
        title="Roles & Permissions"
        description="Decide what each role can see and do. Assign a role to a person from the Users page."
        actions={
          <>
            <Button icon={FiRotateCcw} disabled={!dirty} onClick={() => setDraft(saved)}>
              Discard
            </Button>
            <Button variant="primary" icon={FiSave} disabled={!dirty} onClick={save}>
              Save changes
            </Button>
          </>
        }
      />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {ROLES.map((role) => (
          <div key={role} className="rounded-2xl bg-(--admin-surface) p-4 shadow-sm ring-1 ring-(--admin-line)">
            <p className="flex items-center gap-1.5 text-sm font-semibold">
              {ROLE_LABELS[role]}
              {role === LOCKED_ROLE && <FiLock aria-label="Locked" className="size-3.5 text-(--admin-muted)" />}
            </p>
            <p className="mt-2 text-xs text-(--admin-muted)">
              <span className="font-medium text-(--admin-ink) tabular-nums">
                {USERS.filter((u) => u.role === role).length}
              </span>{" "}
              users ·{" "}
              <span className="font-medium text-(--admin-ink) tabular-nums">{draft[role].length}</span> of{" "}
              {PERMISSIONS.length} permissions
            </p>
          </div>
        ))}
      </div>

      <Card flush title="Permission matrix" description="Admin permissions can't be removed.">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="bg-(--admin-canvas)/60">
                <th scope="col" className="px-5 py-3 text-left text-xs font-medium tracking-wide text-(--admin-muted) uppercase">
                  Permission
                </th>
                {ROLES.map((role) => (
                  <th key={role} scope="col" className="w-28 px-3 py-3 text-center text-xs font-medium">
                    {ROLE_LABELS[role]}
                  </th>
                ))}
              </tr>
            </thead>
            {modules.map(([module, permissions]) => (
              <tbody key={module}>
                <tr>
                  <th
                    scope="colgroup"
                    colSpan={ROLES.length + 1}
                    className="border-t border-(--admin-line) bg-(--admin-canvas)/30 px-5 pt-4 pb-2 text-left text-xs font-semibold tracking-wide uppercase"
                  >
                    {module}
                  </th>
                </tr>
                {permissions.map((permission) => (
                  <tr key={permission.id} className="border-t border-(--admin-line) hover:bg-(--admin-canvas)/40">
                    <th scope="row" className="px-5 py-2.5 text-left font-normal">
                      {permission.label}
                    </th>
                    {ROLES.map((role) => (
                      <td key={role} className="px-3 py-2.5 text-center">
                        <input
                          type="checkbox"
                          aria-label={`${ROLE_LABELS[role]}: ${permission.label}`}
                          checked={draft[role].includes(permission.id)}
                          disabled={role === LOCKED_ROLE}
                          onChange={() => toggle(role, permission.id)}
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
      </Card>
    </>
  );
}
