import { useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { useApi } from "../../lib/apiContext";
import type { AttendanceLog, Employee, EmployeeStatus } from "../types";
import { managerKeys, type AttendanceFilters } from "./keys";

/** The signed-in user's employee record; 403 when they aren't staff. */
export function useCurrentEmployee({ enabled = true }: { enabled?: boolean } = {}) {
  const api = useApi();
  return useQuery({
    queryKey: managerKeys.me,
    queryFn: () => api.get<Employee>("/manager/me"),
    staleTime: 5 * 60_000,
    enabled,
  });
}

/** Every employee; screens filter by role client-side so they all share one cache entry. */
export function useEmployees() {
  const api = useApi();
  return useQuery({
    queryKey: managerKeys.employees,
    queryFn: () => api.get<Employee[]>("/employees"),
  });
}

export type EmployeeFields = Pick<
  Employee,
  "first_name" | "last_name" | "employee_email" | "contact_number" | "work_schedule"
>;

// Attendance rows carry the employee's name, so they refresh with the staff list.
const invalidateStaff = (queryClient: QueryClient) => () =>
  Promise.all([
    queryClient.invalidateQueries({ queryKey: managerKeys.employees }),
    queryClient.invalidateQueries({ queryKey: managerKeys.attendance }),
  ]);

export function useSaveCashier() {
  const api = useApi();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ employeeId, fields }: { employeeId: number | null; fields: EmployeeFields }) =>
      employeeId === null
        ? api.post<Employee>("/employees", { ...fields, employee_role: "cashier" })
        : api.put<Employee>(`/employees/${employeeId}`, fields),
    onSuccess: invalidateStaff(queryClient),
  });
}

/** Partial update, e.g. a new work_schedule or employee_status. */
export function useUpdateEmployee() {
  const api = useApi();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      employeeId,
      changes,
    }: {
      employeeId: number;
      changes: Partial<Pick<Employee, "work_schedule">> & { employee_status?: EmployeeStatus };
    }) => api.put<Employee>(`/employees/${employeeId}`, changes),
    onSuccess: invalidateStaff(queryClient),
  });
}

export function useAttendance(filters: AttendanceFilters) {
  const api = useApi();
  return useQuery({
    queryKey: managerKeys.attendanceList(filters),
    queryFn: () => api.get<AttendanceLog[]>("/attendance", { ...filters }),
  });
}

export function useSetClockOut() {
  const api = useApi();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ logId, time_out }: { logId: number; time_out: string }) =>
      api.patch<AttendanceLog>(`/attendance/${logId}/time-out`, { time_out }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: managerKeys.attendance }),
  });
}
