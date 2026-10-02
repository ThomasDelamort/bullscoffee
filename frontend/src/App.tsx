import { AuthenticateWithRedirectCallback } from '@clerk/clerk-react';
import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { ADMIN_BASE_PATH } from './Admin/routes';
import { AUTH_PATHS, SSO_CALLBACK_PATH } from './AuthPage/routes';
import { CHECKOUT_BASE_PATH } from './checkout/routes';
import { KIOSK_BASE_PATH } from './kiosk/routes';
import { MANAGER_BASE_PATH } from './Manager/routes';
import { POS_BASE_PATH } from './POS/routes';
import CustomerProvider from './auth/CustomerProvider';
import RegistrationNotice from './auth/RegistrationNotice';

// One chunk per app, so a kiosk or register only downloads its own screens.
// The paths come from each app's routes.ts: importing them from its index would pull the whole app back in.
const Home = lazy(() => import('./Home/Home'));
const Footer = lazy(() => import('./components/Footer'));
const AuthPage = lazy(() => import('./AuthPage'));
const AdminRoutes = lazy(() => import('./Admin'));
const ManagerRoutes = lazy(() => import('./Manager'));
const POSRoutes = lazy(() => import('./POS'));
const KioskRoutes = lazy(() => import('./kiosk'));
const CheckoutRoutes = lazy(() => import('./checkout'));

function App() {
  return (
    <CustomerProvider>
      <Suspense fallback={null}>
        <Routes>
          <Route
            element={
              <>
                <Home />
                <Footer />
              </>
            }
          >
            <Route path="/" />
            <Route path="/menu" />
            <Route path="/about" />
            <Route path="/contact" />
          </Route>
          <Route path={AUTH_PATHS['sign-in']} element={<AuthPage mode="sign-in" />} />
          <Route path={AUTH_PATHS['sign-up']} element={<AuthPage mode="sign-up" />} />
          <Route path={SSO_CALLBACK_PATH} element={<AuthenticateWithRedirectCallback />} />
          <Route path={`${ADMIN_BASE_PATH}/*`} element={<AdminRoutes />} />
          <Route path={`${MANAGER_BASE_PATH}/*`} element={<ManagerRoutes />} />
          <Route path={`${POS_BASE_PATH}/*`} element={<POSRoutes />} />
          <Route path={`${KIOSK_BASE_PATH}/*`} element={<KioskRoutes />} />
          <Route path={`${CHECKOUT_BASE_PATH}/*`} element={<CheckoutRoutes />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
      <RegistrationNotice />
    </CustomerProvider>
  );
}

export default App;
