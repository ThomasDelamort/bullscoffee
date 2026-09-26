import { useAuth } from "@clerk/clerk-react";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { CustomerContext, type CustomerNames, type RegistrationState } from "./customerContext";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

export default function CustomerProvider({ children }: { children: ReactNode }) {
  const { isLoaded, isSignedIn, userId, getToken } = useAuth();
  const [state, setState] = useState<RegistrationState>({ status: "idle" });
  // Clerk user we last registered; also guards against StrictMode's double effect run.
  const registeredFor = useRef<string | null>(null);

  const register = useCallback(
    async (names?: CustomerNames) => {
      const forUser = registeredFor.current;
      setState({ status: "registering" });
      try {
        const token = await getToken();
        const res = await fetch(`${API_URL}/api/customers`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(names ?? {}),
        });
        const body = await res.json().catch(() => ({}));
        if (registeredFor.current !== forUser) return;

        if (res.ok) {
          setState({ status: "registered", customer: body.data, isNew: res.status === 201 });
        } else if (res.status === 400) {
          setState({ status: "needs-name" });
        } else {
          setState({
            status: "error",
            message: body.error ?? "We couldn't finish setting up your account.",
          });
        }
      } catch {
        if (registeredFor.current !== forUser) return;
        setState({ status: "error", message: "We couldn't reach the server." });
      }
    },
    [getToken],
  );

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) {
      registeredFor.current = null;
      return;
    }
    if (registeredFor.current === userId) return;
    registeredFor.current = userId;
    void register();
  }, [isLoaded, isSignedIn, userId, register]);

  const current: RegistrationState = isSignedIn ? state : { status: "idle" };

  return (
    <CustomerContext.Provider value={{ state: current, register }}>{children}</CustomerContext.Provider>
  );
}
