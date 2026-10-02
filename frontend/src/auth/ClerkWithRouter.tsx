import { ClerkProvider } from "@clerk/clerk-react";
import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { AUTH_PATHS } from "../AuthPage/routes";

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

/** Lets Clerk navigate through React Router and send users to our own auth pages. */
export default function ClerkWithRouter({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  return (
    <ClerkProvider
      publishableKey={PUBLISHABLE_KEY}
      routerPush={(to) => navigate(to)}
      routerReplace={(to) => navigate(to, { replace: true })}
      signInUrl={AUTH_PATHS["sign-in"]}
      signUpUrl={AUTH_PATHS["sign-up"]}
    >
      {children}
    </ClerkProvider>
  );
}
