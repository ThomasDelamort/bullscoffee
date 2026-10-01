import { QueryClient } from "@tanstack/react-query";
import { isClientError } from "./api";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Screens share lists (products, employees, ...); 30s keeps tab hops instant without going stale.
      staleTime: 30_000,
      // A 4xx (bad input, no access, missing route) won't fix itself on retry.
      retry: (failureCount, error) => !isClientError(error) && failureCount < 2,
    },
    mutations: {
      retry: false,
    },
  },
});
