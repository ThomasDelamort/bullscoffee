import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useApi } from "../../lib/apiContext";
import type { AccountAction, AdminUser, Employee, NewStaff, StaffRole } from "../types";
import { adminKeys } from "./keys";

/** The signed-in user's employee record; 403 when they aren't staff. */
export function useCurrentEmployee({ enabled = true }: { enabled?: boolean } = {}) {
  const api = useApi();
  return useQuery({
    queryKey: adminKeys.me,
    queryFn: () => api.get<Employee>("/manager/me"),
    staleTime: 5 * 60_000,
    enabled,
  });
}

/** Every employee and customer, with Clerk's lock / ban state and last activity. */
export function useAdminUsers() {
  const api = useApi();
  return useQuery({
    queryKey: adminKeys.users,
    queryFn: () => api.get<AdminUser[]>("/admin/users"),
  });
}

// Every change to an account is written to the activity log too.
function useInvalidateUsers() {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: adminKeys.users }),
      queryClient.invalidateQueries({ queryKey: adminKeys.activity }),
    ]);
}

/** Adds the employee and emails them a Clerk invitation. */
export function useInviteStaff() {
  const api = useApi();
  const invalidate = useInvalidateUsers();
  return useMutation({
    mutationFn: (staff: NewStaff) => api.post<Employee>("/admin/users", staff),
    onSuccess: invalidate,
  });
}

export function useUpdateStaff() {
  const api = useApi();
  const invalidate = useInvalidateUsers();
  return useMutation({
    mutationFn: ({
      employeeId,
      changes,
    }: {
      employeeId: number;
      changes: { employee_role?: StaffRole; work_schedule?: string };
    }) => api.patch<Employee>(`/admin/users/employees/${employeeId}`, changes),
    onSuccess: invalidate,
  });
}

/** Lock, unlock, deactivate, reactivate, or sign out of every device. */
export function useAccountAction() {
  const api = useApi();
  const invalidate = useInvalidateUsers();
  return useMutation({
    mutationFn: async ({ clerkId, action }: { clerkId: string; action: AccountAction }) => {
      await api.post(`/admin/users/${encodeURIComponent(clerkId)}/${action}`);
    },
    onSuccess: invalidate,
  });
}
