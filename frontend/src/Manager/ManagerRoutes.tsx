import { Navigate, Route, Routes } from "react-router-dom";
import MainLayout from "./layout/MainLayout";
import Attendance from "./pages/Attendance";
import Dashboard from "./pages/Dashboard";
import Discounts from "./pages/Discounts";
import Feedback from "./pages/Feedback";
import Inventory from "./pages/Inventory";
import Orders from "./pages/Orders";
import PointOfSale from "./pages/PointOfSale";
import Products from "./pages/Products";
import Reports from "./pages/Reports";
import Schedule from "./pages/Schedule";
import Staff from "./pages/Staff";
import Suppliers from "./pages/Suppliers";
import { MANAGER_BASE_PATH } from "./routes";

/** Mounted at `${MANAGER_BASE_PATH}/*`, so every path below is relative to it. */
export default function ManagerRoutes() {
  return (
    <Routes>
      <Route element={<MainLayout />}>
        <Route index element={<Dashboard />} />
        <Route path="pos" element={<PointOfSale />} />
        <Route path="orders" element={<Orders />} />
        <Route path="discounts" element={<Discounts />} />
        <Route path="reports" element={<Reports />} />
        <Route path="feedback" element={<Feedback />} />
        <Route path="products" element={<Products />} />
        <Route path="staff" element={<Staff />} />
        <Route path="schedule" element={<Schedule />} />
        <Route path="attendance" element={<Attendance />} />
        <Route path="inventory" element={<Inventory />} />
        <Route path="suppliers" element={<Suppliers />} />
        <Route path="*" element={<Navigate to={MANAGER_BASE_PATH} replace />} />
      </Route>
    </Routes>
  );
}
