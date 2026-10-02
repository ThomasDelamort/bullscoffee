import { Navigate, Route, Routes } from "react-router-dom";
import "../Home/Hero/hero.css";
import "../kiosk/kiosk.css";
import CheckoutReturn from "./CheckoutReturn";

/**
 * Mounted at `${CHECKOUT_BASE_PATH}/*`: where PayMongo's hosted checkout sends
 * the customer back to (PAYMONGO_SUCCESS_URL / PAYMONGO_CANCEL_URL in the
 * backend's .env). Public, and styled like the kiosk, since that's mostly
 * who lands here.
 */
export default function CheckoutRoutes() {
  return (
    <div className="kiosk-root min-h-dvh bg-(--k-canvas) text-(--k-ink) antialiased">
      <Routes>
        <Route path="success" element={<CheckoutReturn outcome="success" />} />
        <Route path="cancel" element={<CheckoutReturn outcome="cancel" />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}
