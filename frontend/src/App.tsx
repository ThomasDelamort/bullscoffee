import { AuthenticateWithRedirectCallback } from '@clerk/clerk-react';
import { Navigate, Route, Routes } from 'react-router-dom';
import AdminRoutes, { ADMIN_BASE_PATH } from './Admin';
import Home from './Home/Home';
import AuthPage, { AUTH_PATHS, SSO_CALLBACK_PATH } from './AuthPage';
import CustomerProvider from './auth/CustomerProvider';
import RegistrationNotice from './auth/RegistrationNotice';
import Footer from './components/Footer';

function App() {
  return (
    <CustomerProvider>
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
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <RegistrationNotice />
    </CustomerProvider>
  );
}

export default App;
