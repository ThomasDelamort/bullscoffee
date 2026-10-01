import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useApi } from "../../lib/apiContext";
import type { Customer } from "../types";
import { managerKeys } from "./keys";

/** Shorter terms match too much of the table to be useful. */
export const MIN_CUSTOMER_SEARCH = 2;

/** POS customer picker. The backend caps results at 20. Pass a debounced term. */
export function useCustomerSearch(term: string) {
  const api = useApi();
  const search = term.trim();
  return useQuery({
    queryKey: managerKeys.customerSearch(search.toLowerCase()),
    queryFn: () => api.get<Customer[]>("/customers/search", { search }),
    enabled: search.length >= MIN_CUSTOMER_SEARCH,
    placeholderData: keepPreviousData,
    staleTime: 60_000,
  });
}
