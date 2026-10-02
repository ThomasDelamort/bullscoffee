import { Navigate, Route, Routes } from "react-router-dom";
import ToastProvider from "./components/ToastProvider";
import StaffGate from "./layout/StaffGate";
import Register from "./pages/Register";
import { POS_BASE_PATH } from "./routes";
import "./pos.css";

/** Mounted at `${POS_BASE_PATH}/*`: the cashier / barista register. */
export default function POSRoutes() {
  return (
    <div className="pos-root min-h-dvh bg-(--pos-canvas) text-(--pos-ink) antialiased">
      <ToastProvider>
        <StaffGate>
          <Routes>
            <Route index element={<Register />} />
            <Route path="*" element={<Navigate to={POS_BASE_PATH} replace />} />
          </Routes>
        </StaffGate>
      </ToastProvider>
    </div>
  );
}
