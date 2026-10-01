import { MotionConfig } from "motion/react";
import { Navigate, Route, Routes } from "react-router-dom";
import "../Home/Hero/hero.css";
import Kiosk from "./pages/Kiosk";
import { KIOSK_BASE_PATH } from "./routes";
import "./kiosk.css";

/** Mounted at `${KIOSK_BASE_PATH}/*`: the in-store self-order screen. Guests can order without signing in. */
export default function KioskRoutes() {
  return (
    <div className="kiosk-root min-h-dvh bg-(--k-canvas) text-(--k-ink) antialiased">
      <MotionConfig reducedMotion="user">
        <Routes>
          <Route index element={<Kiosk />} />
          <Route path="*" element={<Navigate to={KIOSK_BASE_PATH} replace />} />
        </Routes>
      </MotionConfig>
    </div>
  );
}
