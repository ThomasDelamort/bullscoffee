import { Navigate, Route, Routes } from "react-router-dom";
import ToastProvider from "./components/ToastProvider";
import PosDataProvider from "./data/PosDataProvider";
import Register from "./pages/Register";
import { POS_BASE_PATH } from "./routes";
import "./pos.css";

/** Mounted at `${POS_BASE_PATH}/*`: the cashier / barista register. */
export default function POSRoutes() {
  return (
    <div className="pos-root min-h-dvh bg-(--pos-canvas) text-(--pos-ink) antialiased">
      <PosDataProvider>
        <ToastProvider>
          <Routes>
            <Route index element={<Register />} />
            <Route path="*" element={<Navigate to={POS_BASE_PATH} replace />} />
          </Routes>
        </ToastProvider>
      </PosDataProvider>
    </div>
  );
}
