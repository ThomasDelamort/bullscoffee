import { Navigate, Route, Routes } from "react-router-dom";
import AdminGate from "./layout/AdminGate";
import MainLayout from "./layout/MainLayout";
import ActivityLogs from "./pages/ActivityLogs";
import Backups from "./pages/Backups";
import Dashboard from "./pages/Dashboard";
import DataArchive from "./pages/DataArchive";
import NotificationTemplates from "./pages/NotificationTemplates";
import PaymentGateway from "./pages/PaymentGateway";
import RolesPermissions from "./pages/RolesPermissions";
import Settings from "./pages/Settings";
import SupportTickets from "./pages/SupportTickets";
import SystemHealth from "./pages/SystemHealth";
import Users from "./pages/Users";
import { ADMIN_BASE_PATH } from "./routes";

/** Mounted at `${ADMIN_BASE_PATH}/*`, so every path below is relative to it. */
export default function AdminRoutes() {
  return (
    <Routes>
      <Route
        element={
          <AdminGate>
            <MainLayout />
          </AdminGate>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="users" element={<Users />} />
        <Route path="roles" element={<RolesPermissions />} />
        <Route path="health" element={<SystemHealth />} />
        <Route path="logs" element={<ActivityLogs />} />
        <Route path="tickets" element={<SupportTickets />} />
        <Route path="payments" element={<PaymentGateway />} />
        <Route path="notifications" element={<NotificationTemplates />} />
        <Route path="backups" element={<Backups />} />
        <Route path="archive" element={<DataArchive />} />
        <Route path="settings" element={<Settings />} />
        <Route path="*" element={<Navigate to={ADMIN_BASE_PATH} replace />} />
      </Route>
    </Routes>
  );
}
