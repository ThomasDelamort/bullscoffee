import { useAuth } from "@clerk/clerk-react";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, type ReactNode } from "react";
import { createApiClient } from "./api";
import { ApiContext } from "./apiContext";

/**
 * Gives every query an API client that sends the signed-in Clerk session.
 * Must sit inside both ClerkProvider and QueryClientProvider.
 */
export default function ApiProvider({ children }: { children: ReactNode }) {
  const { getToken, userId, isLoaded } = useAuth();
  const queryClient = useQueryClient();

  // Clerk keeps getToken stable, so this is built once; the token itself is fetched per request.
  const api = useMemo(() => createApiClient(() => getToken()), [getToken]);

  // Cached server data belongs to whoever fetched it: drop it when the user changes or signs out.
  const lastUser = useRef<string | null | undefined>(undefined);
  useEffect(() => {
    if (!isLoaded) return;
    if (lastUser.current !== undefined && lastUser.current !== userId) queryClient.clear();
    lastUser.current = userId ?? null;
  }, [isLoaded, userId, queryClient]);

  return <ApiContext.Provider value={api}>{children}</ApiContext.Provider>;
}
